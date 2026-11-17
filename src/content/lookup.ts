import type { Campaign, Lesson, Step } from './types';

export function getLesson(campaign: Campaign, lessonId: string): Lesson {
  const lesson = campaign.lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    throw new Error(`В кампании нет урока «${lessonId}».`);
  }
  return lesson;
}

export function getStep(lesson: Lesson, stepId: string): Step {
  const step = lesson.steps.find((item) => item.id === stepId);
  if (!step) {
    throw new Error(`В уроке «${lesson.id}» нет шага «${stepId}».`);
  }
  return step;
}

export function lessonIndex(campaign: Campaign, lessonId: string): number {
  return campaign.lessons.findIndex((lesson) => lesson.id === lessonId);
}
