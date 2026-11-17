import type { SimulationParams } from '../content/types';
import {
  compare,
  div,
  floorRational,
  fromInt,
  fromNumber,
  mul,
  sub,
  toNumber,
  type Rational,
} from './decimal';

export interface BudgetFrame {
  limit: number;
  prepCost: number;
  target: number;
}

export interface Decisions {
  segment: string;
  creative: string;
  baseline: boolean;
  tracking: boolean;
  allocation: Record<string, number>;
}

export interface ChannelResult {
  channel: string;
  label: string;
  units: number;
  cost: number;
  impressions: number;
  local: number;
  relevant: number;
  clicks: number;
  rawPaid: number;
  paid: number;
  coded: number | null;
}

export interface SimulationResult {
  cost: number;
  reserve: number;
  rows: ChannelResult[];
  added: number;
  uncappedAdded: number;
  capped: boolean;
  observed: number;
  baselineShown: number | null;
  deltaShown: number | null;
  coded: number | null;
  unattributed: number;
  incrementalContribution: number;
  netContribution: number;
  romi: Rational;
  modelCostPerIncremental: Rational | null;
  costPerTracked: Rational | null;
  targetPassed: boolean;
}

/**
 * Учебная модель coffee-v1. Формулы — раздел 4 пакета, порт sim_check.py.
 * Одинаковые решения всегда дают одинаковый итог.
 */
export function simulateCoffeeV1(
  params: SimulationParams,
  decisions: Decisions,
  budget: BudgetFrame,
): SimulationResult {
  const channelKeys = Object.keys(params.channels);
  assertAllocation(params, decisions, channelKeys);

  const creative = params.creative[decisions.creative];
  const match = params.match[decisions.segment];
  if (!creative) throw new Error(`Нет сообщения «${decisions.creative}».`);
  if (!match) throw new Error(`Нет сегмента «${decisions.segment}».`);

  const unitsTotal = channelKeys.reduce((sum, key) => sum + decisions.allocation[key], 0);
  const measureCost =
    (decisions.baseline ? params.baselineCost : 0) + (decisions.tracking ? params.trackingCost : 0);
  const cost = budget.prepCost + measureCost + params.unitCost * unitsTotal;
  if (cost > budget.limit) {
    throw new Error('Расходы выше недельного лимита.');
  }

  const ctr = fromNumber(creative.ctr);
  const conversion = fromNumber(creative.paidConversion);
  const coverage = fromNumber(params.trackingCoverage);

  const rows: ChannelResult[] = channelKeys.map((key) => {
    const channel = params.channels[key];
    const units = decisions.allocation[key];
    const impressions = units * channel.impressionsPerUnit;
    const local = mul(fromInt(impressions), fromNumber(channel.localShare));
    const segmentShare = match[key];
    if (typeof segmentShare !== 'number') {
      throw new Error(`Нет совпадения сегмента для площадки «${key}».`);
    }
    const relevant = mul(local, fromNumber(segmentShare));
    const clicks = mul(relevant, ctr);
    const rawPaid = mul(clicks, conversion);
    return {
      channel: key,
      label: channel.label,
      units,
      cost: units * params.unitCost,
      impressions,
      local: toNumber(local),
      relevant: toNumber(relevant),
      clicks: toNumber(clicks),
      rawPaid: toNumber(rawPaid),
      paid: floorRational(rawPaid),
      coded: null,
    };
  });

  const uncappedAdded = rows.reduce((sum, row) => sum + row.paid, 0);
  const capped = uncappedAdded > params.capacityIncrement;
  if (capped) {
    const scaled = scaleToCapacity(
      rows.map((row) => row.paid),
      params.capacityIncrement,
    );
    rows.forEach((row, index) => {
      row.paid = scaled[index] ?? 0;
    });
  }

  for (const row of rows) {
    row.coded = decisions.tracking ? floorRational(mul(fromInt(row.paid), coverage)) : null;
  }

  const added = rows.reduce((sum, row) => sum + row.paid, 0);
  const observed = params.trueBaseline + added;
  const coded = decisions.tracking ? rows.reduce((sum, row) => sum + (row.coded ?? 0), 0) : null;
  const incrementalContribution = added * creative.contribution;
  const netContribution = incrementalContribution - cost;

  return {
    cost,
    reserve: budget.limit - cost,
    rows,
    added,
    uncappedAdded,
    capped,
    observed,
    baselineShown: decisions.baseline ? params.trueBaseline : null,
    deltaShown: decisions.baseline ? added : null,
    coded,
    unattributed: decisions.tracking && coded !== null ? observed - coded : observed,
    incrementalContribution,
    netContribution,
    romi: div(fromInt(netContribution * 100), fromInt(cost)),
    modelCostPerIncremental: added > 0 ? div(fromInt(cost), fromInt(added)) : null,
    costPerTracked: coded ? div(fromInt(cost), fromInt(coded)) : null,
    targetPassed: observed >= budget.target,
  };
}

function assertAllocation(
  params: SimulationParams,
  decisions: Decisions,
  channelKeys: string[],
): void {
  for (const key of channelKeys) {
    const units = decisions.allocation[key];
    const max = params.channels[key]?.maxUnits ?? 0;
    if (typeof units !== 'number' || !Number.isInteger(units) || units < 0 || units > max) {
      throw new Error(`Недопустимое число пакетов для площадки «${key}».`);
    }
  }
  const extra = Object.keys(decisions.allocation).filter((key) => !channelKeys.includes(key));
  if (extra.length > 0) {
    throw new Error(`Неизвестная площадка «${extra[0]}».`);
  }
  const total = channelKeys.reduce((sum, key) => sum + decisions.allocation[key], 0);
  if (total > params.maxUnitsTotal) {
    throw new Error('Пакетов больше, чем можно купить за неделю.');
  }
}

/** Метод наибольших остатков. При равном остатке побеждает площадка, которая раньше в списке. */
function scaleToCapacity(paid: number[], capacity: number): number[] {
  const total = paid.reduce((sum, value) => sum + value, 0);
  const scaled = paid.map((value) => div(fromInt(value * capacity), fromInt(total)));
  const floors = scaled.map((value) => floorRational(value));
  let left = capacity - floors.reduce((sum, value) => sum + value, 0);
  const order = scaled
    .map((value, index) => ({ index, remainder: sub(value, fromInt(floors[index] ?? 0)) }))
    .sort((left, right) => {
      const byRemainder = compare(right.remainder, left.remainder);
      return byRemainder !== 0 ? byRemainder : left.index - right.index;
    });
  const next = [...floors];
  for (const item of order) {
    if (left <= 0) break;
    next[item.index] = (next[item.index] ?? 0) + 1;
    left -= 1;
  }
  return next;
}
