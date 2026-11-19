import type {
  Attempt,
  AttemptSummary,
  StoredProgress,
  TopicAnswer,
  TopicRun,
  TopicScore,
  TopicStage,
} from '../engine/attempt';

const STAGES: readonly TopicStage[] = ['cards', 'practice', 'feedback', 'result'];

export function emptyProgress(): StoredProgress {
  return { current: null, history: [], topics: {}, topicRun: null };
}

export function parseProgress(raw: string): StoredProgress {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return emptyProgress();
    return {
      current: isAttempt(value.current) ? value.current : null,
      history: Array.isArray(value.history) ? value.history.filter(isSummary) : [],
      topics: parseTopics(value.topics),
      topicRun: parseRun(value.topicRun),
    };
  } catch {
    return emptyProgress();
  }
}

function isAttempt(value: unknown): value is Attempt {
  if (!isRecord(value) || !isRecord(value.cursor)) return false;
  return (
    typeof value.attemptId === 'string' &&
    typeof value.campaignId === 'string' &&
    typeof value.cursor.lessonId === 'string' &&
    typeof value.cursor.phase === 'string' &&
    Array.isArray(value.answers) &&
    Array.isArray(value.quizAnswers) &&
    Array.isArray(value.requestedCardIds) &&
    Array.isArray(value.goalsFired)
  );
}

function isSummary(value: unknown): value is AttemptSummary {
  return isRecord(value) && typeof value.attemptId === 'string';
}

function parseTopics(value: unknown): Record<string, TopicScore> {
  if (!isRecord(value)) return {};
  const topics: Record<string, TopicScore> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (isScore(raw)) topics[id] = raw;
  }
  return topics;
}

function parseRun(value: unknown): TopicRun | null {
  if (!isRecord(value) || typeof value.topicId !== 'string') return null;
  if (typeof value.stage !== 'string' || !STAGES.includes(value.stage as TopicStage)) return null;
  if (!Array.isArray(value.answers)) return null;
  return {
    topicId: value.topicId,
    stage: value.stage as TopicStage,
    cardIndex: whole(value.cardIndex),
    practiceIndex: whole(value.practiceIndex),
    answers: value.answers.filter(isTopicAnswer),
    stars: whole(value.stars),
    correctFirst: whole(value.correctFirst),
    startedAt: typeof value.startedAt === 'string' ? value.startedAt : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
    startTracked: value.startTracked === true,
    completeTracked: value.completeTracked === true,
  };
}

function isScore(value: unknown): value is TopicScore {
  if (!isRecord(value)) return false;
  return (
    isStarCount(value.stars) &&
    typeof value.correctFirst === 'number' &&
    typeof value.graded === 'number' &&
    typeof value.updatedAt === 'string'
  );
}

function isTopicAnswer(value: unknown): value is TopicAnswer {
  return (
    isRecord(value) &&
    typeof value.itemId === 'string' &&
    typeof value.choiceId === 'string' &&
    typeof value.correct === 'boolean' &&
    typeof value.firstTry === 'boolean'
  );
}

function isStarCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3;
}

function whole(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.trunc(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
