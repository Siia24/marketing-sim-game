import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fromDecimalString } from '../src/engine/decimal';
import { formatClicks, formatPercent } from '../src/engine/format';

describe('числа на экране', () => {
  it('склоняет «клик» и ставит плюс или тот же минус, что у денег', () => {
    assert.equal(formatClicks(1), '1 клик');
    assert.equal(formatClicks(2), '2 клика');
    assert.equal(formatClicks(11), '11 кликов');
    assert.equal(formatClicks(21), '21 клик');
    assert.equal(formatClicks(64), '64 клика');
    assert.equal(formatClicks(216), '216 кликов');
    assert.equal(formatPercent(fromDecimalString('16.67')), '+16,67%');
    assert.equal(formatPercent(fromDecimalString('-92.73')), '−92,73%');
    assert.equal(formatPercent(fromDecimalString('0')), '0%');
  });
});
