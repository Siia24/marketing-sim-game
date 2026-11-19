import type { Attempt } from '../engine/attempt';

export function goHome(router: {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/') => void;
}): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function lessonPath(campaignId: string, lessonId: string): string {
  return `/campaign/${campaignId}/lesson/${lessonId}`;
}

export function quizPath(campaignId: string, lessonId: string): string {
  return `/campaign/${campaignId}/quiz/${lessonId}`;
}

export function reportPath(campaignId: string): string {
  return `/campaign/${campaignId}/report`;
}

export function resumePath(campaignId: string, attempt: Attempt): string {
  if (attempt.status === 'completed' || attempt.cursor.phase === 'report') {
    return reportPath(campaignId);
  }
  if (attempt.cursor.phase === 'quiz' || attempt.cursor.phase === 'quiz-feedback') {
    return quizPath(campaignId, attempt.cursor.lessonId);
  }
  return lessonPath(campaignId, attempt.cursor.lessonId);
}
