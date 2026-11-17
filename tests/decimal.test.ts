import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fromDecimalString, quantizeHalfEven } from '../src/engine/decimal';

describe('десятичное округление', () => {
  it('совпадает с ROUND_HALF_EVEN из Python', () => {
    assert.equal(quantizeHalfEven(fromDecimalString('1.225'), 2), '1.22');
    assert.equal(quantizeHalfEven(fromDecimalString('1.235'), 2), '1.24');
    assert.equal(quantizeHalfEven(fromDecimalString('-1.225'), 2), '-1.22');
    assert.equal(quantizeHalfEven(fromDecimalString('16.666666'), 2), '16.67');
    assert.equal(quantizeHalfEven(fromDecimalString('-92.727272'), 2), '-92.73');
    assert.equal(quantizeHalfEven(fromDecimalString('2750'), 2), '2750');
    assert.equal(quantizeHalfEven(fromDecimalString('218.181818'), 2), '218.18');
  });
});
