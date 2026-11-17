import { getLesson, getStep } from '../content/lookup';
import type { Campaign, Effects, Step } from '../content/types';
import type { Answer } from './attempt';
import { simulateCoffeeV1, type Decisions, type SimulationResult } from './simulate';

export interface GameFacts {
  budgetLimit: number;
  prepCost: number;
  spent: number;
  baselineEnabled: boolean;
  trackingEnabled: boolean;
  segment: string | null;
  creative: string | null;
  allocation: Record<string, number> | null;
  baselinePaidVisits: number | null;
  targetPaidVisits: number;
  goalKnown: boolean;
  constraintsKnown: boolean;
  mediaReady: boolean;
  reportReasoningPassed: boolean;
  nextTest: string | null;
  campaignComplete: boolean;
  revealed: string[];
}

/** Состояние каждый раз собирается из ответов, поэтому расход нельзя списать дважды. */
export function reduceFacts(
  campaign: Campaign,
  answers: Answer[],
  requestedCardIds: string[],
): GameFacts {
  const initial = campaign.initialState;
  const facts: GameFacts = {
    budgetLimit: initial.budgetLimit,
    prepCost: initial.prepCost,
    // Начальный spent уже включает подготовку публикации.
    spent: initial.spent,
    baselineEnabled: initial.baselineEnabled,
    trackingEnabled: initial.trackingEnabled,
    segment: initial.segment,
    creative: initial.creative,
    allocation: initial.allocation ? { ...initial.allocation } : null,
    baselinePaidVisits: initial.baselinePaidVisits,
    targetPaidVisits: initial.targetPaidVisits,
    goalKnown: false,
    constraintsKnown: false,
    mediaReady: false,
    reportReasoningPassed: false,
    nextTest: null,
    campaignComplete: false,
    revealed: [...requestedCardIds],
  };

  const seen = new Set<string>();
  for (const answer of answers) {
    if (!answer.advanced) continue;
    const key = `${answer.lessonId}/${answer.stepId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    applyAnswer(facts, getStep(getLesson(campaign, answer.lessonId), answer.stepId), answer);
  }

  if (facts.baselineEnabled) {
    facts.baselinePaidVisits = campaign.simulation.trueBaseline;
  }
  return facts;
}

export function decisionsFromFacts(facts: GameFacts): Decisions | null {
  if (!facts.segment || !facts.creative || !facts.allocation) return null;
  return {
    segment: facts.segment,
    creative: facts.creative,
    baseline: facts.baselineEnabled,
    tracking: facts.trackingEnabled,
    allocation: facts.allocation,
  };
}

export function resultFromFacts(campaign: Campaign, facts: GameFacts): SimulationResult | null {
  const decisions = decisionsFromFacts(facts);
  if (!decisions) return null;
  return simulateCoffeeV1(campaign.simulation, decisions, {
    limit: facts.budgetLimit,
    prepCost: facts.prepCost,
    target: facts.targetPaidVisits,
  });
}

function applyAnswer(facts: GameFacts, step: Step, answer: Answer): void {
  if (step.type === 'choice' || step.type === 'assemble') {
    const choice = step.choices.find((item) => item.id === answer.choiceId);
    if (!choice) return;
    applyEffects(facts, choice.effects);
    return;
  }
  if (step.type === 'allocate' && answer.input) {
    const units = Object.values(answer.input).reduce((sum, value) => sum + value, 0);
    facts.allocation = { ...answer.input };
    facts.spent += units * step.input.unitCost;
    return;
  }
  if (step.type === 'debrief') {
    applyEffects(facts, step.effects);
  }
}

function applyEffects(facts: GameFacts, effects: Effects | undefined): void {
  if (!effects) return;
  if (effects.set) {
    for (const [key, value] of Object.entries(effects.set)) {
      if (key in facts) {
        (facts as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }
  if (typeof effects.spend === 'number') facts.spent += effects.spend;
  if (effects.reveal) {
    for (const id of effects.reveal) {
      if (!facts.revealed.includes(id)) facts.revealed.push(id);
    }
  }
  if (effects.completeCampaign) facts.campaignComplete = true;
}
