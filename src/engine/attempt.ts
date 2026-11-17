export type Phase =
  'situation' | 'step' | 'feedback' | 'bridge' | 'quiz' | 'quiz-feedback' | 'report';

export interface Cursor {
  lessonId: string;
  phase: Phase;
  stepId?: string;
  questionIndex?: number;
}

export interface Answer {
  lessonId: string;
  stepId: string;
  choiceId?: string;
  input?: Record<string, number>;
  advanced: boolean;
  at: string;
}

export interface QuizAnswer {
  lessonId: string;
  questionId: string;
  choiceId: string;
  correct: boolean;
  at: string;
}

export interface Attempt {
  attemptId: string;
  campaignId: string;
  contentVersion: string;
  simulationVersion: string;
  status: 'in_progress' | 'completed';
  cursor: Cursor;
  answers: Answer[];
  quizAnswers: QuizAnswer[];
  requestedCardIds: string[];
  goalsFired: string[];
  startedAt: string;
  updatedAt: string;
}

export interface AttemptSummary {
  attemptId: string;
  finishedAt: string;
  status: Attempt['status'];
  observedChecks: number | null;
  netContribution: number | null;
  targetPassed: boolean | null;
  segment: string | null;
  creative: string | null;
}

export interface StoredProgress {
  current: Attempt | null;
  history: AttemptSummary[];
}
