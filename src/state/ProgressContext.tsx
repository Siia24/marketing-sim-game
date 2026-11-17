import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { goalsToFire, type GoalId } from '../analytics/goals';
import { track } from '../analytics/track';
import { findCampaign, listCampaigns } from '../content/registry';
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
}

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Record<string, StoredProgress>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      listCampaigns().map(async (campaign) => {
        const loaded = compatibleAttempt(campaign, await loadProgress(campaign.id));
        return [campaign.id, loaded] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setSaved(Object.fromEntries(entries));
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

  async function commit(campaign: Campaign, progress: StoredProgress, extra: GoalId[] = []) {
    const stamped = stampGoals(campaign, progress, extra);
    try {
      await saveProgress(campaign.id, stamped.progress);
      setSaved((prev) => ({ ...prev, [campaign.id]: stamped.progress }));
      for (const goal of stamped.goals) track(goal);
    } catch {
      setError('Не удалось сохранить шаг.');
    }
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
        if (live(campaign.id).current) return;
        const at = now();
        await commit(campaign, {
          history: live(campaign.id).history,
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
