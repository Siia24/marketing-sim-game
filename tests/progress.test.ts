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
});
