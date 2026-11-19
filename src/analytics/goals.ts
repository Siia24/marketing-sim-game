import type { Campaign } from '../content/types';
import type { Attempt } from '../engine/attempt';

/** Идентификаторы reachGoal из docs/metrika-goals.md. */
export const GOAL_IDS = [
  'lesson1_start',
  'quiz1_complete',
  'lesson3_start',
  'campaign_complete',
  'campaign_replay',
  'topic_start',
  'topic_complete',
] as const;

export type GoalId = (typeof GOAL_IDS)[number];

/**
 * Цели, которые ещё не отмечены в этой попытке.
 * Повторный заход и обновление страницы их не шлют: список уже лежит в сохранении.
 * campaign_replay сюда не входит — её ставит сама кнопка новой попытки.
 */
export function goalsToFire(campaign: Campaign, attempt: Attempt): GoalId[] {
  const fired = new Set(attempt.goalsFired);
  const goals: GoalId[] = [];
  const push = (goal: GoalId) => {
    if (!fired.has(goal)) goals.push(goal);
  };

  const index = campaign.lessons.findIndex((lesson) => lesson.id === attempt.cursor.lessonId);
  if (index === 0) push('lesson1_start');
  if (index === 2) push('lesson3_start');

  const first = campaign.lessons[0];
  if (first) {
    const answered = attempt.quizAnswers.filter((answer) => answer.lessonId === first.id).length;
    if (answered >= first.quiz.questions.length) push('quiz1_complete');
  }
  if (attempt.status === 'completed') push('campaign_complete');
  return goals;
}
