import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { goalsToFire } from '../src/analytics/goals';
import { loadCampaign } from '../src/content/loadCampaign';
import { createAttempt } from '../src/engine/flow';
import { loadCoffee } from './helpers';

const campaign = loadCoffee();

describe('цели Метрики', () => {
  it('открытие первого и третьего урока, квиз и финал отмечаются один раз', () => {
    const attempt = createAttempt(campaign, 'a', '2026-11-17T12:00:00.000Z');
    assert.deepEqual(goalsToFire(campaign, attempt), ['lesson1_start']);

    const seen = { ...attempt, goalsFired: ['lesson1_start'] };
    assert.deepEqual(goalsToFire(campaign, seen), []);

    const third = campaign.lessons[2];
    assert.ok(third);
    const atLesson3 = {
      ...seen,
      cursor: { lessonId: third.id, phase: 'situation' as const },
    };
    assert.deepEqual(goalsToFire(campaign, atLesson3), ['lesson3_start']);

    const first = campaign.lessons[0];
    assert.ok(first);
    const quizzed = {
      ...seen,
      quizAnswers: first.quiz.questions.map((question) => ({
        lessonId: first.id,
        questionId: question.id,
        choiceId: 'x',
        correct: false,
        at: '2026-11-17T12:00:00.000Z',
      })),
    };
    assert.deepEqual(goalsToFire(campaign, quizzed), ['quiz1_complete']);

    const done = { ...seen, status: 'completed' as const };
    assert.deepEqual(goalsToFire(campaign, done), ['campaign_complete']);
  });

  it('неизвестная схема не загружается', () => {
    assert.throws(() => loadCampaign({ schemaVersion: 2, id: 'x' }), /schemaVersion/);
    assert.equal(loadCampaign(campaign).id, 'coffee-weekday');
    assert.equal(campaign.contentVersion, '1.1.0');
  });
});
