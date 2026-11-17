import type { Attempt, AttemptSummary, StoredProgress } from '../engine/attempt';

export function emptyProgress(): StoredProgress {
  return { current: null, history: [] };
}

export function parseProgress(raw: string): StoredProgress {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return emptyProgress();
    return {
      current: isAttempt(value.current) ? value.current : null,
      history: Array.isArray(value.history) ? value.history.filter(isSummary) : [],
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
