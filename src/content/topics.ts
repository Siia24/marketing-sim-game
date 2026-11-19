import { getLesson, getStep } from './lookup';
import { listCampaigns } from './registry';
import type { Campaign, ChapterRef, Lesson } from './types';

export interface TopicLine {
  speaker?: string;
  text: string;
}

export interface TopicCard {
  id: string;
  title: string;
  lines: TopicLine[];
  /** Связка собрана для карты тем. Текст внутри — из урока, заголовок стоит сверить с учебником. */
  needsCheck?: boolean;
}

export interface TopicChoice {
  id: string;
  label: string;
  feedback: string;
  correct: boolean;
  reply?: { speaker: string; text: string };
}

export interface TopicQuestion {
  id: string;
  prompt: string;
  sourcesLabel: string;
  choices: TopicChoice[];
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  summaryNeedsCheck: boolean;
  minutes: number;
  sourcesLabel: string;
  cards: TopicCard[];
  questions: TopicQuestion[];
}

type CardSpec =
  | { kind: 'situation'; lessonId: string }
  | { kind: 'data'; lessonId: string; cardId: string }
  | {
      kind: 'rule';
      lessonId: string;
      stepId: string;
      when: string;
      title: string;
      needsCheck?: boolean;
    };

type QuestionSpec =
  | { kind: 'quiz'; lessonId: string; questionId: string }
  | { kind: 'choice'; lessonId: string; stepId: string };

interface TopicSpec {
  id: string;
  title: string;
  lessonId: string;
  minutes: number;
  chapters?: number[];
  summary?: string;
  summaryNeedsCheck?: boolean;
  cards: CardSpec[];
  questions: QuestionSpec[];
}

/**
 * Тексты не копируются: карточки и вопросы читаются из уроков кейса.
 * Две короткие формулировки взяты из пакета кампании и помечены summaryNeedsCheck.
 */
const COFFEE_TOPICS: TopicSpec[] = [
  {
    id: 'brief',
    title: 'Бриф',
    lessonId: 'brief',
    minutes: 5,
    cards: [
      { kind: 'situation', lessonId: 'brief' },
      { kind: 'data', lessonId: 'brief', cardId: 'initial' },
    ],
    questions: [
      { kind: 'quiz', lessonId: 'brief', questionId: 'brief-q1-metric' },
      { kind: 'quiz', lessonId: 'brief', questionId: 'brief-q2-baseline' },
      { kind: 'quiz', lessonId: 'brief', questionId: 'brief-q3-constraints' },
      { kind: 'quiz', lessonId: 'brief', questionId: 'brief-q4-smart' },
    ],
  },
  {
    id: 'audience',
    title: 'Аудитория',
    lessonId: 'audience',
    minutes: 4,
    cards: [
      { kind: 'situation', lessonId: 'audience' },
      { kind: 'data', lessonId: 'audience', cardId: 'research' },
      { kind: 'data', lessonId: 'audience', cardId: 'forecast' },
    ],
    questions: [
      { kind: 'quiz', lessonId: 'audience', questionId: 'audience-q1-broad' },
      { kind: 'quiz', lessonId: 'audience', questionId: 'audience-q2-interviews' },
      { kind: 'quiz', lessonId: 'audience', questionId: 'audience-q3-situation' },
      { kind: 'quiz', lessonId: 'audience', questionId: 'audience-q4-remote' },
    ],
  },
  {
    id: 'content',
    title: 'SMM и контент',
    lessonId: 'content',
    minutes: 6,
    cards: [
      { kind: 'situation', lessonId: 'content' },
      { kind: 'data', lessonId: 'content', cardId: 'offer' },
      { kind: 'data', lessonId: 'content', cardId: 'multipliers' },
    ],
    questions: [
      { kind: 'quiz', lessonId: 'content', questionId: 'content-q1-message' },
      { kind: 'quiz', lessonId: 'content', questionId: 'content-q2-discount' },
      { kind: 'quiz', lessonId: 'content', questionId: 'content-q3-tracking' },
      { kind: 'quiz', lessonId: 'content', questionId: 'content-q4-local-creative' },
    ],
  },
  {
    id: 'bloggers',
    title: 'Блогеры',
    lessonId: 'media',
    minutes: 4,
    chapters: [18, 20],
    summary: 'Подписчики не равны показам рядом с точкой.',
    summaryNeedsCheck: true,
    cards: [
      { kind: 'situation', lessonId: 'media' },
      { kind: 'data', lessonId: 'media', cardId: 'blogger_audit' },
      { kind: 'data', lessonId: 'media', cardId: 'legal' },
    ],
    questions: [
      { kind: 'choice', lessonId: 'media', stepId: 'readiness' },
      { kind: 'quiz', lessonId: 'media', questionId: 'media-q3-mediakit' },
      { kind: 'quiz', lessonId: 'media', questionId: 'media-q4-labeling' },
    ],
  },
  {
    id: 'media',
    title: 'Медиаплан',
    lessonId: 'media',
    minutes: 5,
    chapters: [7, 35],
    summary: 'Дешёвый показ и нужный показ — разные вещи.',
    summaryNeedsCheck: true,
    cards: [
      { kind: 'data', lessonId: 'media', cardId: 'prices' },
      {
        kind: 'rule',
        lessonId: 'media',
        stepId: 'allocate',
        when: 'city_majority',
        title: 'Дешёвый показ и нужный показ',
        needsCheck: true,
      },
    ],
    questions: [
      { kind: 'quiz', lessonId: 'media', questionId: 'media-q1-local-share' },
      { kind: 'quiz', lessonId: 'media', questionId: 'media-q2-impressions-reach' },
      { kind: 'quiz', lessonId: 'report', questionId: 'report-q3-cpm' },
    ],
  },
  {
    id: 'report',
    title: 'Аналитика и отчёт',
    lessonId: 'report',
    minutes: 5,
    cards: [
      { kind: 'situation', lessonId: 'report' },
      { kind: 'data', lessonId: 'report', cardId: 'report' },
    ],
    questions: [
      { kind: 'choice', lessonId: 'report', stepId: 'conclusion' },
      { kind: 'quiz', lessonId: 'report', questionId: 'report-q1-all-ads' },
      { kind: 'quiz', lessonId: 'report', questionId: 'report-q2-codes' },
      { kind: 'quiz', lessonId: 'report', questionId: 'report-q4-next' },
    ],
  },
];

export function topicsFor(campaign: Campaign): Topic[] {
  if (campaign.id !== 'coffee-weekday') return [];
  return COFFEE_TOPICS.map((spec) => resolveTopic(campaign, spec));
}

export function findTopic(topicId: string): { campaign: Campaign; topic: Topic } | undefined {
  for (const campaign of listCampaigns()) {
    const topic = topicsFor(campaign).find((item) => item.id === topicId);
    if (topic) return { campaign, topic };
  }
  return undefined;
}

function resolveTopic(campaign: Campaign, spec: TopicSpec): Topic {
  const lesson = getLesson(campaign, spec.lessonId);
  const sources = spec.chapters
    ? lesson.sources.filter((source) => spec.chapters?.includes(source.chapter))
    : lesson.sources;
  return {
    id: spec.id,
    title: spec.title,
    summary: spec.summary ?? lesson.objective,
    summaryNeedsCheck: spec.summaryNeedsCheck === true,
    minutes: spec.minutes,
    sourcesLabel: sourceLine(sources),
    cards: spec.cards.map((card) => resolveCard(campaign, card)),
    questions: spec.questions.map((question) => resolveQuestion(campaign, question)),
  };
}

function resolveCard(campaign: Campaign, spec: CardSpec): TopicCard {
  const lesson = getLesson(campaign, spec.lessonId);
  if (spec.kind === 'situation') {
    return {
      id: `${lesson.id}:situation`,
      title: 'Ситуация',
      lines: lesson.situation.map((line) => ({ speaker: line.speaker, text: line.text })),
    };
  }
  if (spec.kind === 'data') {
    const card = lesson.data.find((item) => item.id === spec.cardId);
    if (!card) throw new Error(`В уроке «${lesson.id}» нет карточки «${spec.cardId}».`);
    return { id: `${lesson.id}:${card.id}`, title: card.title, lines: [{ text: card.text }] };
  }
  const step = getStep(lesson, spec.stepId);
  if (step.type !== 'allocate') {
    throw new Error(`Правило «${spec.when}» лежит не в шаге распределения.`);
  }
  const rule = step.feedbackRules.find((item) => item.when === spec.when);
  if (!rule) throw new Error(`В шаге «${spec.stepId}» нет правила «${spec.when}».`);
  return {
    id: `${lesson.id}:${step.id}:${spec.when}`,
    title: spec.title,
    lines: [{ text: rule.text }],
    needsCheck: spec.needsCheck,
  };
}

function resolveQuestion(campaign: Campaign, spec: QuestionSpec): TopicQuestion {
  const lesson = getLesson(campaign, spec.lessonId);
  if (spec.kind === 'quiz') return questionFromQuiz(lesson, spec.questionId);
  return questionFromChoice(lesson, spec.stepId);
}

function questionFromQuiz(lesson: Lesson, questionId: string): TopicQuestion {
  const question = lesson.quiz.questions.find((item) => item.id === questionId);
  if (!question) throw new Error(`В уроке «${lesson.id}» нет вопроса «${questionId}».`);
  return {
    id: question.id,
    prompt: question.prompt,
    sourcesLabel: sourceLine(question.sources ?? []),
    choices: question.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      feedback: choice.feedback,
      correct: choice.correct,
    })),
  };
}

function questionFromChoice(lesson: Lesson, stepId: string): TopicQuestion {
  const step = getStep(lesson, stepId);
  if (step.type !== 'choice') {
    throw new Error(`Шаг «${stepId}» не является выбором.`);
  }
  const advancing = step.choices.filter((choice) => choice.advance);
  if (advancing.length !== 1) {
    throw new Error(`Шаг «${stepId}» нельзя оценить: верных переходов ${advancing.length}.`);
  }
  return {
    id: `${lesson.id}:${step.id}`,
    prompt: step.prompt,
    sourcesLabel: sourceLine(lesson.sources),
    choices: step.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      feedback: choice.feedback,
      correct: choice.advance,
      reply: choice.reply,
    })),
  };
}

function sourceLine(sources: ChapterRef[]): string {
  return sources.map((source) => `гл. ${source.chapter} «${source.title}»`).join('; ');
}
