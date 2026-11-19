import type { StoredProgress, TopicScore } from './attempt';

/** Порядок стабильный: так его видит игрок и так пишет тест. */
export const ACHIEVEMENT_IDS = [
  'first_topic',
  'brief_stars',
  'report_stars',
  'campaign_done',
  'all_topics',
  'all_stars',
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

const BRIEF_TOPIC = 'brief';
const REPORT_TOPIC = 'report';

export function isAchievementId(value: string): value is AchievementId {
  return (ACHIEVEMENT_IDS as readonly string[]).includes(value);
}

export function campaignIsDone(progress: Pick<StoredProgress, 'current' | 'history'>): boolean {
  if (progress.current?.status === 'completed') return true;
  return progress.history.some((item) => item.status === 'completed');
}

/**
 * Знаки считаются из уже лежащих в сохранении звёзд и статуса кейса.
 * Пустой список тем не выдаёт «все темы»: так новая кампания без карты не закрывает знаки сама.
 */
export function earnedAchievements(input: {
  topicIds: readonly string[];
  topics: Record<string, Pick<TopicScore, 'stars'> | undefined>;
  campaignCompleted: boolean;
}): AchievementId[] {
  const { topicIds, topics, campaignCompleted } = input;
  const done = (id: string) => topics[id] !== undefined;
  const earned: AchievementId[] = [];
  if (topicIds.some(done)) earned.push('first_topic');
  if (topics[BRIEF_TOPIC]?.stars === 3) earned.push('brief_stars');
  if (topics[REPORT_TOPIC]?.stars === 3) earned.push('report_stars');
  if (campaignCompleted) earned.push('campaign_done');
  if (topicIds.length > 0 && topicIds.every(done)) earned.push('all_topics');
  if (topicIds.length > 0 && topicIds.every((id) => topics[id]?.stars === 3)) {
    earned.push('all_stars');
  }
  return earned;
}

/** Уже записанные знаки не возвращаются в fresh и не шлют цель второй раз. */
export function mergeAchievements(
  progress: StoredProgress,
  topicIds: readonly string[],
): { progress: StoredProgress; fresh: AchievementId[] } {
  const earned = earnedAchievements({
    topicIds,
    topics: progress.topics,
    campaignCompleted: campaignIsDone(progress),
  });
  const have = new Set(progress.achievements);
  const fresh = earned.filter((id) => !have.has(id));
  if (fresh.length === 0) return { progress, fresh };
  return {
    fresh,
    progress: { ...progress, achievements: [...progress.achievements, ...fresh] },
  };
}
