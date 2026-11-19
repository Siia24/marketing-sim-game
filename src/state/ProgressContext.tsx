import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { goalsToFire, type GoalId } from '../analytics/goals';
import { track } from '../analytics/track';
import { findCampaign, listCampaigns } from '../content/registry';
import { findTopic, topicsFor } from '../content/topics';
import { mergeAchievements, type AchievementId } from '../engine/achievements';
import type { Campaign } from '../content/types';
import type { Attempt, StoredProgress } from '../engine/attempt';
import { reduceFacts, resultFromFacts, type GameFacts } from '../engine/facts';
import type { SimulationResult } from '../engine/simulate';
import {
  compatibleAttempt,
  confirmDebrief,
  continueBridge,
  continueFeedback,
  continueQuiz,
  continueSituation,
  createAttempt,
  createAttemptId,
  replay,
  replayFromLesson,
  requestCard,
  submitAllocation,
  submitChoice,
  submitQuiz,
} from '../engine/flow';
import { advanceTopicRun, answerTopicRun, beginTopicRun } from '../engine/topicFlow';
import { emptyProgress, loadProgress, saveProgress } from './storage';

interface ProgressApi {
  ready: boolean;
  error: string | null;
  progressFor: (campaignId: string) => StoredProgress;
  factsFor: (campaign: Campaign) => GameFacts | null;
  start: (campaign: Campaign) => Promise<void>;
  choose: (campaign: Campaign, choiceId: string) => Promise<void>;
  allocate: (campaign: Campaign, input: Record<string, number>) => Promise<string | null>;
  finishDebrief: (campaign: Campaign) => Promise<void>;
  nextFromSituation: (campaign: Campaign) => Promise<void>;
  nextFromFeedback: (campaign: Campaign) => Promise<void>;
  nextFromBridge: (campaign: Campaign) => Promise<void>;
  answerQuiz: (campaign: Campaign, choiceId: string) => Promise<void>;
  nextFromQuiz: (campaign: Campaign) => Promise<void>;
  revealCard: (campaign: Campaign, cardId: string) => Promise<void>;
  replayCampaign: (campaign: Campaign) => Promise<void>;
  replayLesson: (campaign: Campaign, lessonId: string) => Promise<void>;
  beginTopic: (topicId: string) => Promise<void>;
  answerTopic: (topicId: string, choiceId: string) => Promise<void>;
  advanceTopic: (topicId: string) => Promise<void>;
  seeIntro: (campaignId: string) => Promise<void>;
  unlockQueue: AchievementId[];
  dismissUnlock: () => void;
}

interface FiredGoal {
  id: GoalId;
  params?: Record<string, string | number | boolean>;
}

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Record<string, StoredProgress>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockQueue, setUnlockQueue] = useState<AchievementId[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      listCampaigns().map(async (campaign) => {
        const loaded = compatibleAttempt(campaign, await loadProgress(campaign.id));
        const stamped = mergeAchievements(
          loaded,
          topicsFor(campaign).map((topic) => topic.id),
        );
        if (stamped.fresh.length === 0) return { id: campaign.id, progress: loaded, fresh: [] };
        try {
          await saveProgress(campaign.id, stamped.progress);
          return { id: campaign.id, progress: stamped.progress, fresh: stamped.fresh };
        } catch {
          return { id: campaign.id, progress: loaded, fresh: [] as AchievementId[] };
        }
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setSaved(Object.fromEntries(entries.map((entry) => [entry.id, entry.progress])));
        const fresh = entries.flatMap((entry) => entry.fresh);
        setUnlockQueue(fresh);
        for (const id of fresh) track('achievement_unlock', { id });
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось прочитать сохранение.');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function progressFor(campaignId: string): StoredProgress {
    return saved[campaignId] ?? emptyProgress();
  }

  function factsFor(campaign: Campaign): GameFacts | null {
    const attempt = progressFor(campaign.id).current;
    if (!attempt) return null;
    return reduceFacts(campaign, attempt.answers, attempt.requestedCardIds);
  }

  async function persist(campaignId: string, progress: StoredProgress, goals: FiredGoal[]) {
    const campaign = findCampaign(campaignId);
    const stamped = campaign
      ? mergeAchievements(
          progress,
          topicsFor(campaign).map((topic) => topic.id),
        )
      : { progress, fresh: [] as AchievementId[] };
    const outgoing: FiredGoal[] = [
      ...goals,
      ...stamped.fresh.map((id) => ({ id: 'achievement_unlock' as const, params: { id } })),
    ];
    try {
      await saveProgress(campaignId, stamped.progress);
      setSaved((prev) => ({ ...prev, [campaignId]: stamped.progress }));
      if (stamped.fresh.length > 0) setUnlockQueue((queue) => [...queue, ...stamped.fresh]);
      for (const goal of outgoing) track(goal.id, goal.params);
    } catch {
      setError('Не удалось сохранить шаг.');
    }
  }

  async function commit(campaign: Campaign, progress: StoredProgress, extra: GoalId[] = []) {
    const stamped = stampGoals(campaign, progress, extra);
    await persist(
      campaign.id,
      stamped.progress,
      stamped.goals.map((id) => ({ id })),
    );
  }

  async function run(task: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    try {
      await task();
    } finally {
      busy.current = false;
    }
  }

  function live(campaignId: string): StoredProgress {
    return saved[campaignId] ?? emptyProgress();
  }

  const api: ProgressApi = {
    ready,
    error,
    progressFor,
    factsFor,
    start(campaign) {
      return run(async () => {
        const progress = live(campaign.id);
        if (progress.current) return;
        const at = now();
        await commit(campaign, {
          ...progress,
          current: createAttempt(campaign, createAttemptId(), at),
        });
      });
    },
    choose(campaign, choiceId) {
      return run(async () => {
        const progress = live(campaign.id);
        if (!progress.current) return;
        const next = submitChoice(campaign, progress.current, choiceId, now());
        if (next === progress.current) return;
        await commit(campaign, { ...progress, current: next });
      });
    },
    async allocate(campaign, input) {
      let message: string | null = null;
      await run(async () => {
        const progress = live(campaign.id);
        if (!progress.current) return;
        const outcome = submitAllocation(campaign, progress.current, input, now());
        message = outcome.error;
        if (outcome.error || outcome.attempt === progress.current) return;
        await commit(campaign, { ...progress, current: outcome.attempt });
      });
      return message;
    },
    finishDebrief(campaign) {
      return run(async () => {
        const progress = live(campaign.id);
        if (!progress.current) return;
        const next = confirmDebrief(campaign, progress.current, now());
        if (next === progress.current) return;
        await commit(campaign, { ...progress, current: next });
      });
    },
    nextFromSituation(campaign) {
      return mutate(campaign, (attempt, at) => continueSituation(campaign, attempt, at));
    },
    nextFromFeedback(campaign) {
      return mutate(campaign, (attempt, at) => continueFeedback(campaign, attempt, at));
    },
    nextFromBridge(campaign) {
      return mutate(campaign, (attempt, at) => continueBridge(attempt, at));
    },
    answerQuiz(campaign, choiceId) {
      return mutate(campaign, (attempt, at) => submitQuiz(campaign, attempt, choiceId, at));
    },
    nextFromQuiz(campaign) {
      return mutate(campaign, (attempt, at) => continueQuiz(campaign, attempt, at));
    },
    revealCard(campaign, cardId) {
      return mutate(campaign, (attempt, at) => requestCard(attempt, cardId, at));
    },
    replayCampaign(campaign) {
      return run(async () => {
        const at = now();
        await commit(campaign, replay(campaign, live(campaign.id), createAttemptId(), at), [
          'campaign_replay',
        ]);
      });
    },
    replayLesson(campaign, lessonId) {
      return run(async () => {
        const at = now();
        await commit(
          campaign,
          replayFromLesson(campaign, live(campaign.id), lessonId, createAttemptId(), at),
          ['campaign_replay'],
        );
      });
    },
    beginTopic(topicId) {
      return run(async () => {
        const found = findTopic(topicId);
        if (!found) return;
        const at = now();
        let progress = beginTopicRun(live(found.campaign.id), found.topic, at);
        if (!progress.topicRun) return;
        progress = { ...progress, topicRun: { ...progress.topicRun, startTracked: true } };
        await persist(found.campaign.id, progress, [
          { id: 'topic_start', params: { topic: topicId } },
        ]);
      });
    },
    answerTopic(topicId, choiceId) {
      return run(async () => {
        const found = findTopic(topicId);
        if (!found) return;
        const before = live(found.campaign.id);
        const progress = answerTopicRun(before, found.topic, choiceId, now());
        if (progress === before) return;
        await persist(found.campaign.id, progress, []);
      });
    },
    advanceTopic(topicId) {
      return run(async () => {
        const found = findTopic(topicId);
        if (!found) return;
        const before = live(found.campaign.id);
        let progress = advanceTopicRun(before, found.topic, now());
        if (progress === before || !progress.topicRun) return;
        const goals: FiredGoal[] = [];
        if (progress.topicRun.stage === 'result' && !progress.topicRun.completeTracked) {
          const stars = progress.topicRun.stars;
          progress = {
            ...progress,
            topicRun: { ...progress.topicRun, completeTracked: true },
          };
          goals.push({ id: 'topic_complete', params: { topic: topicId, stars } });
        }
        await persist(found.campaign.id, progress, goals);
      });
    },
    seeIntro(campaignId) {
      return run(async () => {
        const progress = live(campaignId);
        if (progress.seenIntro) return;
        await persist(campaignId, { ...progress, seenIntro: true }, []);
      });
    },
    unlockQueue,
    dismissUnlock() {
      setUnlockQueue((queue) => queue.slice(1));
    },
  };

  function mutate(campaign: Campaign, change: (attempt: Attempt, at: string) => Attempt) {
    return run(async () => {
      const progress = live(campaign.id);
      if (!progress.current) return;
      const next = change(progress.current, now());
      if (next === progress.current) return;
      await commit(campaign, { ...progress, current: next });
    });
  }

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}

export function useCampaign(campaignId: string) {
  const api = useContext(ProgressContext);
  if (!api) throw new Error('Экран открыт вне ProgressProvider.');
  const campaign = findCampaign(campaignId);
  const progress = api.progressFor(campaignId);
  const facts = campaign ? api.factsFor(campaign) : null;
  const result = campaign && facts ? resultFromFacts(campaign, facts) : null;
  return {
    ...api,
    campaign,
    progress,
    attempt: progress.current,
    facts,
    result,
  };
}

export function useCampaignList() {
  const api = useContext(ProgressContext);
  if (!api) throw new Error('Экран открыт вне ProgressProvider.');
  return { ...api, campaigns: listCampaigns() };
}

function stampGoals(campaign: Campaign, progress: StoredProgress, extra: GoalId[]) {
  const attempt = progress.current;
  if (!attempt) return { progress, goals: [] as GoalId[] };
  const goals = [...extra, ...goalsToFire(campaign, attempt)].filter(
    (goal, index, list) => !attempt.goalsFired.includes(goal) && list.indexOf(goal) === index,
  );
  if (goals.length === 0) return { progress, goals };
  return {
    goals,
    progress: {
      ...progress,
      current: { ...attempt, goalsFired: [...attempt.goalsFired, ...goals] },
    },
  };
}

function now(): string {
  return new Date().toISOString();
}

export type { GameFacts, SimulationResult };
