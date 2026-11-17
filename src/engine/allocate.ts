import type { AllocateStep, Campaign } from '../content/types';
import type { GameFacts } from './facts';

export function validateAllocation(
  campaign: Campaign,
  facts: GameFacts,
  step: AllocateStep,
  allocation: Record<string, number>,
): string | null {
  const { input } = step;
  for (const channel of input.channels) {
    const units = allocation[channel];
    const max = input.maxUnitsByChannel[channel] ?? 0;
    if (typeof units !== 'number' || (input.integer && !Number.isInteger(units))) {
      return step.validationError;
    }
    if (units < input.minUnits || units > max) return step.validationError;
  }
  const total = input.channels.reduce((sum, channel) => sum + (allocation[channel] ?? 0), 0);
  if (total > campaign.simulation.maxUnitsTotal) return step.validationError;
  const cost = facts.spent + total * input.unitCost;
  if (cost > facts.budgetLimit) return step.validationError;
  if (input.validate.includes('mediaReady') && !facts.mediaReady) return step.validationError;
  return null;
}

export function allocationFeedback(
  step: AllocateStep,
  allocation: Record<string, number>,
  segment: string | null,
): string[] {
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  const city = allocation.city ?? 0;
  const district = allocation.district ?? 0;
  const blogger = allocation.blogger ?? 0;
  return step.feedbackRules
    .filter((rule) => matches(rule.when, { total, city, district, blogger, segment }))
    .map((rule) => rule.text);
}

function matches(
  when: string,
  ctx: {
    total: number;
    city: number;
    district: number;
    blogger: number;
    segment: string | null;
  },
): boolean {
  switch (when) {
    case 'always':
      return true;
    case 'no_units':
      return ctx.total === 0;
    case 'city_majority':
      return ctx.total > 0 && ctx.city * 2 > ctx.total;
    case 'office_and_district_majority':
      return ctx.segment === 'office' && ctx.total > 0 && ctx.district * 2 > ctx.total;
    case 'remote_and_blogger_nonzero':
      return ctx.segment === 'remote' && ctx.blogger > 0;
    default:
      return false;
  }
}
