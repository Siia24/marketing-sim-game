import type { TopicScore } from './attempt';

/**
 * 3 — все ответы захода верные.
 * 2 — верна хотя бы половина, но не все.
 * 1 — верный ответ есть, его меньше половины.
 * 0 — верных нет или вопросов не было.
 */
export function starsFor(correctFirst: number, graded: number): number {
  if (graded <= 0 || correctFirst <= 0) return 0;
  if (correctFirst >= graded) return 3;
  if (correctFirst * 2 >= graded) return 2;
  return 1;
}

export function starRow(value: number, max = 3): string {
  const filled = Math.max(0, Math.min(max, Math.trunc(value)));
  return `${'★'.repeat(filled)}${'☆'.repeat(max - filled)}`;
}

/** Слабый повтор не затирает лучший результат. */
export function keepBest(previous: TopicScore | undefined, next: TopicScore): TopicScore {
  if (!previous) return next;
  if (next.stars > previous.stars) return next;
  if (next.stars === previous.stars && next.correctFirst > previous.correctFirst) return next;
  return previous;
}

export function totalStars(
  topicIds: string[],
  scores: Record<string, TopicScore>,
): { got: number; max: number } {
  const got = topicIds.reduce((sum, id) => sum + (scores[id]?.stars ?? 0), 0);
  return { got, max: topicIds.length * 3 };
}
