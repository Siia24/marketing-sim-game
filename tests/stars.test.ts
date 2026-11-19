import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TopicScore } from '../src/engine/attempt';
import { keepBest, starsFor } from '../src/engine/stars';

const at = '2026-11-19T12:00:00.000Z';

describe('звёзды темы', () => {
  it('делит результат по доле верных ответов', () => {
    assert.equal(starsFor(4, 4), 3);
    assert.equal(starsFor(3, 4), 2);
    assert.equal(starsFor(2, 4), 2);
    assert.equal(starsFor(1, 4), 1);
    assert.equal(starsFor(0, 4), 0);
    assert.equal(starsFor(2, 3), 2);
    assert.equal(starsFor(1, 3), 1);
    assert.equal(starsFor(1, 2), 2);
    assert.equal(starsFor(0, 0), 0);
  });

  it('оставляет лучший результат', () => {
    const weak = score(1, 1, 4);
    const mid = score(2, 2, 4);
    const sameStarsBetter = score(2, 3, 4);
    const perfect = score(3, 4, 4);
    assert.equal(keepBest(undefined, weak).stars, 1);
    assert.equal(keepBest(mid, weak).stars, 2);
    assert.equal(keepBest(mid, sameStarsBetter).correctFirst, 3);
    assert.equal(keepBest(perfect, mid).stars, 3);
    assert.equal(keepBest(perfect, mid).correctFirst, 4);
  });
});

function score(stars: number, correctFirst: number, graded: number): TopicScore {
  return { stars, correctFirst, graded, updatedAt: at };
}
