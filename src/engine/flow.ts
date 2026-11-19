import { getLesson, getStep, lessonIndex } from '../content/lookup';
import type { Campaign } from '../content/types';
import { validateAllocation } from './allocate';
import type { Answer, Attempt, AttemptSummary, StoredProgress } from './attempt';
import { reduceFacts, resultFromFacts } from './facts';

export function createAttemptId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAttempt(campaign: Campaign, attemptId: string, at: string): Attempt {
  const first = campaign.lessons[0];
  if (!first) throw new Error('В кампании нет уроков.');
  return {
    attemptId,
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    simulationVersion: campaign.simulationVersion,
    status: 'in_progress',
    cursor: { lessonId: first.id, phase: 'situation' },
    answers: [],
    quizAnswers: [],
    requestedCardIds: [],
    goalsFired: [],
    startedAt: at,
    updatedAt: at,
  };
}

export function majorVersion(version: string): string {
  return version.split('.')[0] ?? version;
}

/** Смена старшего номера контента или формулы не продолжает старую попытку. */
export function compatibleAttempt(campaign: Campaign, progress: StoredProgress): StoredProgress {
  const current = progress.current;
  if (!current) return progress;
  const sameContent =
    majorVersion(current.contentVersion) === majorVersion(campaign.contentVersion);
  const sameSimulation = current.simulationVersion === campaign.simulationVersion;
  if (sameContent && sameSimulation) return progress;
  return { ...progress, current: null };
}

export function continueSituation(campaign: Campaign, attempt: Attempt, at: string): Attempt {
  if (attempt.cursor.phase !== 'situation') return attempt;
  const lesson = getLesson(campaign, attempt.cursor.lessonId);
  const first = lesson.steps[0];
  if (!first) return attempt;
  return touch(attempt, at, {
    cursor: { lessonId: lesson.id, phase: 'step', stepId: first.id },
  });
}

export function submitChoice(
  campaign: Campaign,
  attempt: Attempt,
  choiceId: string,
  at: string,
): Attempt {
  const stepId = attempt.cursor.stepId;
  if (attempt.cursor.phase !== 'step' || !stepId) return attempt;
  const lesson = getLesson(campaign, attempt.cursor.lessonId);
  const step = getStep(lesson, stepId);
  if (step.type !== 'choice' && step.type !== 'assemble') return attempt;
  if (alreadyAdvanced(attempt, lesson.id, step.id)) return attempt;
  const choice = step.choices.find((item) => item.id === choiceId);
  if (!choice) throw new Error(`Нет варианта «${choiceId}».`);
  const answer: Answer = {
    lessonId: lesson.id,
    stepId: step.id,
    choiceId,
    advanced: choice.advance,
    at,
  };
  return touch(attempt, at, {
    answers: [...attempt.answers, answer],
    cursor: { lessonId: lesson.id, phase: 'feedback', stepId: step.id },
  });
}

export function submitAllocation(
  campaign: Campaign,
  attempt: Attempt,
  input: Record<string, number>,
  at: string,
): { attempt: Attempt; error: string | null } {
  const stepId = attempt.cursor.stepId;
  if (attempt.cursor.phase !== 'step' || !stepId) return { attempt, error: null };
  const lesson = getLesson(campaign, attempt.cursor.lessonId);
  const step = getStep(lesson, stepId);
  if (step.type !== 'allocate') return { attempt, error: null };
  const facts = reduceFacts(campaign, attempt.answers, attempt.requestedCardIds);
  const error = validateAllocation(campaign, facts, step, input);
  if (error) return { attempt, error };
  if (alreadyAdvanced(attempt, lesson.id, step.id)) return { attempt, error: null };
  const answer: Answer = {
    lessonId: lesson.id,
    stepId: step.id,
    input: { ...input },
    advanced: true,
    at,
  };
  return {
    error: null,
    attempt: touch(attempt, at, {
      answers: [...attempt.answers, answer],
      cursor: { lessonId: lesson.id, phase: 'feedback', stepId: step.id },
    }),
  };
}

export function confirmDebrief(campaign: Campaign, attempt: Attempt, at: string): Attempt {
  const stepId = attempt.cursor.stepId;
  if (attempt.cursor.phase !== 'step' || !stepId) return attempt;
  const lesson = getLesson(campaign, attempt.cursor.lessonId);
  const step = getStep(lesson, stepId);
  if (step.type !== 'debrief' || alreadyAdvanced(attempt, lesson.id, step.id)) return attempt;
  const answer: Answer = { lessonId: lesson.id, stepId: step.id, advanced: true, at };
  return touch(attempt, at, {
    answers: [...attempt.answers, answer],
    cursor: { lessonId: lesson.id, phase: 'bridge' },
  });
}

export function continueFeedback(campaign: Campaign, attempt: Attempt, at: string): Attempt {
  const { cursor } = attempt;
  if (cursor.phase !== 'feedback' || !cursor.stepId) return attempt;
  const latest = [...attempt.answers]
    .reverse()
    .find((answer) => answer.lessonId === cursor.lessonId && answer.stepId === cursor.stepId);
  if (!latest?.advanced) {
    return touch(attempt, at, {
      cursor: { lessonId: cursor.lessonId, phase: 'step', stepId: cursor.stepId },
    });
  }
  const lesson = getLesson(campaign, cursor.lessonId);
  const index = lesson.steps.findIndex((step) => step.id === cursor.stepId);
  const next = lesson.steps[index + 1];
  if (next) {
    return touch(attempt, at, {
      cursor: { lessonId: lesson.id, phase: 'step', stepId: next.id },
    });
  }
  return touch(attempt, at, { cursor: { lessonId: lesson.id, phase: 'bridge' } });
}

export function continueBridge(attempt: Attempt, at: string): Attempt {
  if (attempt.cursor.phase !== 'bridge') return attempt;
  return touch(attempt, at, {
    cursor: { lessonId: attempt.cursor.lessonId, phase: 'quiz', questionIndex: 0 },
  });
}

export function submitQuiz(
  campaign: Campaign,
  attempt: Attempt,
  choiceId: string,
  at: string,
): Attempt {
  if (attempt.cursor.phase !== 'quiz') return attempt;
  const lesson = getLesson(campaign, attempt.cursor.lessonId);
  const question = lesson.quiz.questions[attempt.cursor.questionIndex ?? 0];
  if (!question) return attempt;
  if (attempt.quizAnswers.some((answer) => answer.questionId === question.id)) return attempt;
  const choice = question.choices.find((item) => item.id === choiceId);
  if (!choice) return attempt;
  return touch(attempt, at, {
    quizAnswers: [
      ...attempt.quizAnswers,
      {
        lessonId: lesson.id,
        questionId: question.id,
        choiceId,
        correct: choice.correct,
        at,
      },
    ],
    cursor: { ...attempt.cursor, phase: 'quiz-feedback' },
  });
}

export function continueQuiz(campaign: Campaign, attempt: Attempt, at: string): Attempt {
  if (attempt.cursor.phase !== 'quiz-feedback') return attempt;
  const lesson = getLesson(campaign, attempt.cursor.lessonId);
  const index = attempt.cursor.questionIndex ?? 0;
  if (index + 1 < lesson.quiz.questions.length) {
    return touch(attempt, at, {
      cursor: { lessonId: lesson.id, phase: 'quiz', questionIndex: index + 1 },
    });
  }
  const nextLesson = campaign.lessons[lessonIndex(campaign, lesson.id) + 1];
  if (nextLesson) {
    return touch(attempt, at, { cursor: { lessonId: nextLesson.id, phase: 'situation' } });
  }
  return touch(attempt, at, {
    status: 'completed',
    cursor: { lessonId: lesson.id, phase: 'report' },
  });
}

export function requestCard(attempt: Attempt, cardId: string, at: string): Attempt {
  if (attempt.requestedCardIds.includes(cardId)) return attempt;
  return touch(attempt, at, { requestedCardIds: [...attempt.requestedCardIds, cardId] });
}

export function replay(
  campaign: Campaign,
  progress: StoredProgress,
  attemptId: string,
  at: string,
): StoredProgress {
  return {
    ...progress,
    history: archiveIfCompleted(campaign, progress, at),
    current: createAttempt(campaign, attemptId, at),
  };
}

export function replayFromLesson(
  campaign: Campaign,
  progress: StoredProgress,
  lessonId: string,
  attemptId: string,
  at: string,
): StoredProgress {
  const index = lessonIndex(campaign, lessonId);
  if (index < 0) return progress;
  const source = progress.current;
  const keptLessons = new Set(campaign.lessons.slice(0, index).map((lesson) => lesson.id));
  const keptCards = new Set(
    campaign.lessons
      .filter((lesson) => keptLessons.has(lesson.id))
      .flatMap((lesson) => lesson.data.map((card) => card.id)),
  );
  const next = createAttempt(campaign, attemptId, at);
  if (source) {
    next.startedAt = source.startedAt;
    next.answers = source.answers.filter((answer) => keptLessons.has(answer.lessonId));
    next.quizAnswers = source.quizAnswers.filter((answer) => keptLessons.has(answer.lessonId));
    next.requestedCardIds = source.requestedCardIds.filter((id) => keptCards.has(id));
  }
  next.cursor = { lessonId, phase: 'situation' };
  return {
    ...progress,
    history: archiveIfCompleted(campaign, progress, at),
    current: next,
  };
}

export function summarizeAttempt(campaign: Campaign, attempt: Attempt, at: string): AttemptSummary {
  const facts = reduceFacts(campaign, attempt.answers, attempt.requestedCardIds);
  const result = resultFromFacts(campaign, facts);
  return {
    attemptId: attempt.attemptId,
    finishedAt: at,
    status: attempt.status,
    observedChecks: result?.observed ?? null,
    netContribution: result?.netContribution ?? null,
    targetPassed: result?.targetPassed ?? null,
    segment: facts.segment,
    creative: facts.creative,
  };
}

export function lessonProgress(
  campaign: Campaign,
  attempt: Attempt | null,
  lessonId: string,
): 'done' | 'current' | 'locked' {
  const index = lessonIndex(campaign, lessonId);
  if (!attempt) return index === 0 ? 'current' : 'locked';
  if (attempt.status === 'completed') return 'done';
  const current = lessonIndex(campaign, attempt.cursor.lessonId);
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'locked';
}

function archiveIfCompleted(
  campaign: Campaign,
  progress: StoredProgress,
  at: string,
): AttemptSummary[] {
  if (!progress.current || progress.current.status !== 'completed') return progress.history;
  return [...progress.history, summarizeAttempt(campaign, progress.current, at)];
}

function alreadyAdvanced(attempt: Attempt, lessonId: string, stepId: string): boolean {
  return attempt.answers.some(
    (answer) => answer.lessonId === lessonId && answer.stepId === stepId && answer.advanced,
  );
}

function touch(attempt: Attempt, at: string, patch: Partial<Attempt>): Attempt {
  return { ...attempt, ...patch, updatedAt: at };
}
