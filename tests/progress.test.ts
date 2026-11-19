import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAttempt } from '../src/engine/flow';
import { parseProgress } from '../src/state/parseProgress';
import { loadCoffee } from './helpers';

describe('сохранение', () => {
  it('читает попытку обратно и отбрасывает битый json', () => {
    const attempt = createAttempt(loadCoffee(), 'saved', '2026-11-17T12:00:00.000Z');
    const raw = JSON.stringify({ current: attempt, history: [] });
    const parsed = parseProgress(raw);
    assert.equal(parsed.current?.cursor.lessonId, attempt.cursor.lessonId);
    assert.equal(parsed.current?.cursor.phase, 'situation');
    assert.equal(parseProgress('не json').current, null);
    assert.equal(parseProgress('{"current":{"nope":true}}').current, null);
  });

  it('старое сохранение без тем не теряет попытку кейса', () => {
    const attempt = createAttempt(loadCoffee(), 'legacy', '2026-11-17T12:00:00.000Z');
    const parsed = parseProgress(
      JSON.stringify({ current: attempt, history: [{ attemptId: 'older' }] }),
    );
    assert.equal(parsed.current?.attemptId, 'legacy');
    assert.equal(parsed.history[0]?.attemptId, 'older');
    assert.deepEqual(parsed.topics, {});
    assert.equal(parsed.topicRun, null);
  });

  it('читает звёзды и выбрасывает битую запись, не трогая попытку', () => {
    const attempt = createAttempt(loadCoffee(), 'kept', '2026-11-17T12:00:00.000Z');
    const parsed = parseProgress(
      JSON.stringify({
        current: attempt,
        history: [],
        topics: {
          brief: { stars: 2, correctFirst: 3, graded: 4, updatedAt: 't' },
          bad: { stars: 'много' },
          over: { stars: 9, correctFirst: 1, graded: 1, updatedAt: 't' },
        },
        topicRun: {
          topicId: 'brief',
          stage: 'practice',
          answers: [{ itemId: 'q', choiceId: 'a', correct: true, firstTry: true }, { nope: true }],
          cardIndex: 1,
          practiceIndex: 0,
          stars: 0,
          correctFirst: 0,
          startedAt: 't',
          updatedAt: 't',
          startTracked: true,
          completeTracked: false,
        },
      }),
    );
    assert.equal(parsed.current?.attemptId, 'kept');
    assert.equal(parsed.topics.brief?.stars, 2);
    assert.equal(parsed.topics.bad, undefined);
    assert.equal(parsed.topics.over, undefined);
    assert.equal(parsed.topicRun?.stage, 'practice');
    assert.equal(parsed.topicRun?.answers.length, 1);
    assert.equal(
      parseProgress(JSON.stringify({ current: attempt, topicRun: { stage: 'nope' } })).topicRun,
      null,
    );
  });
});
