import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCampaign } from '../src/content/loadCampaign';
import type { Campaign } from '../src/content/types';
import type { Attempt } from '../src/engine/attempt';
import { reduceFacts, resultFromFacts, type GameFacts } from '../src/engine/facts';
import {
  confirmDebrief,
  continueBridge,
  continueFeedback,
  continueQuiz,
  continueSituation,
  createAttempt,
  submitAllocation,
  submitChoice,
  submitQuiz,
} from '../src/engine/flow';
import type { SimulationResult } from '../src/engine/simulate';

export function loadCoffee(): Campaign {
  const raw = readFileSync(
    join(process.cwd(), 'src/content/campaigns/campaign-coffee.json'),
    'utf8',
  );
  return loadCampaign(JSON.parse(raw));
}

const AT = '2026-11-17T12:00:00.000Z';

type Action =
  | { kind: 'choice'; id: string }
  | { kind: 'allocate'; input: Record<string, number> }
  | { kind: 'debrief' }
  | { kind: 'wrong-then'; wrongId: string; rightId: string };

/** Проходит уроки по списку решений, квиз отвечает первым верным вариантом. */
export function play(
  campaign: Campaign,
  lessons: Action[][],
): {
  attempt: Attempt;
  facts: GameFacts;
  result: SimulationResult;
} {
  let attempt = createAttempt(campaign, 'test-attempt', AT);
  lessons.forEach((actions, lessonIndex) => {
    const lesson = campaign.lessons[lessonIndex];
    if (!lesson) throw new Error(`Нет урока ${lessonIndex}`);
    if (attempt.cursor.lessonId !== lesson.id) {
      throw new Error(`Ожидали урок ${lesson.id}, курсор на ${attempt.cursor.lessonId}`);
    }
    attempt = continueSituation(campaign, attempt, AT);
    for (const action of actions) {
      attempt = applyAction(campaign, attempt, action);
    }
    if (attempt.cursor.phase === 'bridge') {
      attempt = continueBridge(attempt, AT);
    }
    for (const question of lesson.quiz.questions) {
      const correct = question.choices.find((choice) => choice.correct);
      if (!correct) throw new Error(`В вопросе ${question.id} нет верного ответа`);
      attempt = submitQuiz(campaign, attempt, correct.id, AT);
      attempt = continueQuiz(campaign, attempt, AT);
    }
  });
  const facts = reduceFacts(campaign, attempt.answers, attempt.requestedCardIds);
  const result = resultFromFacts(campaign, facts);
  if (!result) throw new Error('Симуляция не собралась');
  return { attempt, facts, result };
}

function applyAction(campaign: Campaign, attempt: Attempt, action: Action): Attempt {
  if (action.kind === 'wrong-then') {
    let next = submitChoice(campaign, attempt, action.wrongId, AT);
    next = continueFeedback(campaign, next, AT);
    next = submitChoice(campaign, next, action.rightId, AT);
    return continueFeedback(campaign, next, AT);
  }
  if (action.kind === 'choice') {
    return continueFeedback(campaign, submitChoice(campaign, attempt, action.id, AT), AT);
  }
  if (action.kind === 'allocate') {
    const outcome = submitAllocation(campaign, attempt, action.input, AT);
    if (outcome.error) throw new Error(outcome.error);
    return continueFeedback(campaign, outcome.attempt, AT);
  }
  return confirmDebrief(campaign, attempt, AT);
}

export const PATH_A: Action[][] = [
  [
    { kind: 'wrong-then', wrongId: 'followers', rightId: 'traffic' },
    { kind: 'choice', id: 'constraints' },
    { kind: 'choice', id: 'save' },
    { kind: 'choice', id: 'paid_visits' },
  ],
  [{ kind: 'choice', id: 'office' }],
  [
    { kind: 'choice', id: 'focused' },
    { kind: 'choice', id: 'track' },
  ],
  [
    { kind: 'choice', id: 'ready' },
    { kind: 'allocate', input: { district: 3, blogger: 2, city: 0 } },
  ],
  [{ kind: 'choice', id: 'careful' }, { kind: 'choice', id: 'controlled' }, { kind: 'debrief' }],
];

export const PATH_B: Action[][] = [
  [
    { kind: 'choice', id: 'traffic' },
    { kind: 'choice', id: 'constraints' },
    { kind: 'choice', id: 'skip' },
    { kind: 'choice', id: 'paid_visits' },
  ],
  [{ kind: 'choice', id: 'broad' }],
  [
    { kind: 'choice', id: 'atmosphere' },
    { kind: 'choice', id: 'none' },
  ],
  [
    { kind: 'choice', id: 'ready' },
    { kind: 'allocate', input: { district: 0, blogger: 0, city: 5 } },
  ],
  [{ kind: 'choice', id: 'careful' }, { kind: 'choice', id: 'iterate' }, { kind: 'debrief' }],
];
