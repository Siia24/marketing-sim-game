import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { quantizeHalfEven } from '../src/engine/decimal';
import { simulateCoffeeV1, type Decisions } from '../src/engine/simulate';
import { loadCoffee } from './helpers';

const campaign = loadCoffee();
const budget = {
  limit: campaign.initialState.budgetLimit,
  prepCost: campaign.initialState.prepCost,
  target: campaign.initialState.targetPaidVisits,
};

function run(decisions: Decisions) {
  return simulateCoffeeV1(campaign.simulation, decisions, budget);
}

const pathA: Decisions = {
  segment: 'office',
  creative: 'focused',
  baseline: true,
  tracking: true,
  allocation: { district: 3, blogger: 2, city: 0 },
};

const pathB: Decisions = {
  segment: 'broad',
  creative: 'atmosphere',
  baseline: false,
  tracking: false,
  allocation: { district: 0, blogger: 0, city: 5 },
};

describe('simulateCoffeeV1', () => {
  it('прохождение А: 170 чеков, вклад +2000, ROMI +16,67%', () => {
    const result = run(pathA);
    assert.deepEqual(
      result.rows.map((row) => row.paid),
      [54, 16, 0],
    );
    assert.deepEqual(
      result.rows.map((row) => row.coded),
      [43, 12, 0],
    );
    assert.equal(result.rows[0]?.clicks, 216);
    assert.equal(result.rows[1]?.clicks, 64);
    assert.equal(result.added, 70);
    assert.equal(result.observed, 170);
    assert.equal(result.cost, 12000);
    assert.equal(result.reserve, 0);
    assert.equal(result.coded, 55);
    assert.equal(result.unattributed, 115);
    assert.equal(result.incrementalContribution, 14000);
    assert.equal(result.netContribution, 2000);
    assert.equal(result.baselineShown, 100);
    assert.equal(result.deltaShown, 70);
    assert.equal(result.targetPassed, true);
    assert.equal(quantizeHalfEven(result.romi, 2), '16.67');
    assert.equal(quantizeHalfEven(result.costPerTracked!, 2), '218.18');
    assert.equal(quantizeHalfEven(result.modelCostPerIncremental!, 2), '171.43');
  });

  it('прохождение Б: 104 чека, вклад −10200, ROMI −92,73%', () => {
    const result = run(pathB);
    assert.equal(result.rows[2]?.impressions, 100000);
    assert.equal(result.rows[2]?.clicks, 40);
    assert.equal(result.rows[2]?.paid, 4);
    assert.equal(result.added, 4);
    assert.equal(result.observed, 104);
    assert.equal(result.cost, 11000);
    assert.equal(result.reserve, 1000);
    assert.equal(result.coded, null);
    assert.equal(result.unattributed, 104);
    assert.equal(result.baselineShown, null);
    assert.equal(result.deltaShown, null);
    assert.equal(result.incrementalContribution, 800);
    assert.equal(result.netContribution, -10200);
    assert.equal(result.targetPassed, false);
    assert.equal(quantizeHalfEven(result.romi, 2), '-92.73');
    assert.equal(quantizeHalfEven(result.modelCostPerIncremental!, 2), '2750');
    assert.equal(result.costPerTracked, null);
  });

  it('одно изменение решения двигает итог так, как в пакете', () => {
    const focusedCity = run({ ...pathB, creative: 'focused' });
    assert.equal(focusedCity.added, 20);
    assert.equal(focusedCity.cost, 11000);
    assert.equal(focusedCity.netContribution, -7000);
    assert.equal(quantizeHalfEven(focusedCity.romi, 2), '-63.64');

    const noMeasure = run({ ...pathA, baseline: false, tracking: false });
    assert.equal(noMeasure.added, 70);
    assert.equal(noMeasure.cost, 11000);
    assert.equal(noMeasure.netContribution, 3000);
    assert.equal(quantizeHalfEven(noMeasure.romi, 2), '27.27');

    const remote = run({ ...pathA, segment: 'remote' });
    assert.equal(remote.added, 64);
    assert.equal(remote.cost, 12000);
    assert.equal(remote.netContribution, 800);
    assert.equal(quantizeHalfEven(remote.romi, 2), '6.67');

    const discount = run({ ...pathA, creative: 'discount' });
    assert.deepEqual(
      discount.rows.map((row) => row.paid),
      [78, 22, 0],
    );
    assert.equal(discount.added, 100);
    assert.equal(discount.capped, true);
    assert.equal(discount.uncappedAdded, 125);
    assert.equal(discount.cost, 12000);
    assert.equal(discount.netContribution, -2000);
    assert.equal(quantizeHalfEven(discount.romi, 2), '-16.67');
    assert.deepEqual(
      discount.rows.map((row) => row.coded),
      [62, 17, 0],
    );
  });

  it('перебирает 1512 допустимых планов и держит бюджет и мощность', () => {
    const { match, creative } = campaign.simulation;
    let checks = 0;
    for (const baseline of [false, true]) {
      for (const tracking of [false, true]) {
        for (const segment of Object.keys(match)) {
          for (const message of Object.keys(creative)) {
            for (let district = 0; district < 4; district += 1) {
              for (let blogger = 0; blogger < 3; blogger += 1) {
                for (let city = 0; city < 6; city += 1) {
                  if (district + blogger + city > 5) continue;
                  const result = run({
                    segment,
                    creative: message,
                    baseline,
                    tracking,
                    allocation: { district, blogger, city },
                  });
                  assert.ok(result.added >= 0 && result.added <= 100);
                  assert.ok(result.reserve >= 0);
                  assert.equal(result.observed, 100 + result.added);
                  assert.equal(result.cost <= 12000, true);
                  if (tracking && result.coded !== null) {
                    assert.ok(result.coded <= result.added);
                    assert.equal(result.coded + result.unattributed, result.observed);
                  }
                  if (!baseline) {
                    assert.equal(result.baselineShown, null);
                    assert.equal(result.deltaShown, null);
                  }
                  checks += 1;
                }
              }
            }
          }
        }
      }
    }
    assert.equal(checks, 1512);
  });
});
