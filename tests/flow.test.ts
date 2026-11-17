import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getLesson } from '../src/content/lookup';
import { assemblyParts } from '../src/engine/assemble';
import { reduceFacts } from '../src/engine/facts';
import {
  continueFeedback,
  createAttempt,
  replay,
  replayFromLesson,
  submitChoice,
} from '../src/engine/flow';
import { emptyProgress } from '../src/state/parseProgress';
import { PATH_A, PATH_B, loadCoffee, play } from './helpers';

const campaign = loadCoffee();
const at = '2026-11-17T12:00:00.000Z';

describe('ход урока', () => {
  it('прохождение А через состояние урока даёт те же деньги, что симуляция', () => {
    const { facts, result, attempt } = play(campaign, PATH_A);
    assert.equal(result.observed, 170);
    assert.equal(result.netContribution, 2000);
    assert.equal(facts.spent, result.cost);
    assert.equal(facts.baselineEnabled, true);
    assert.equal(facts.trackingEnabled, true);
    assert.equal(facts.revealed.includes('blogger_audit'), true);
    assert.equal(attempt.status, 'completed');
    assert.equal(attempt.cursor.phase, 'report');
    assert.equal(facts.campaignComplete, true);
  });

  it('прохождение Б не включает базу и коды', () => {
    const { facts, result } = play(campaign, PATH_B);
    assert.equal(result.observed, 104);
    assert.equal(result.netContribution, -10200);
    assert.equal(facts.spent, 11000);
    assert.equal(facts.baselineEnabled, false);
    assert.equal(facts.baselinePaidVisits, null);
    assert.equal(result.coded, null);
  });

  it('неверный ответ не списывает бюджет и возвращает на тот же шаг', () => {
    let attempt = createAttempt(campaign, 'retry', at);
    attempt = continueFeedback(
      campaign,
      submitChoice(
        campaign,
        { ...attempt, cursor: { lessonId: 'brief', phase: 'step', stepId: 'ask_goal' } },
        'followers',
        at,
      ),
      at,
    );
    const facts = reduceFacts(campaign, attempt.answers, []);
    assert.equal(facts.spent, 1000);
    assert.equal(attempt.cursor.phase, 'step');
    assert.equal(attempt.cursor.stepId, 'ask_goal');
    assert.equal(attempt.answers.length, 1);
    assert.equal(attempt.answers[0]?.advanced, false);
  });

  it('повтор с урока публикации забывает медиаплан и отчёт', () => {
    const played = play(campaign, PATH_A);
    const progress = replayFromLesson(
      campaign,
      { current: played.attempt, history: [] },
      'content',
      'second',
      at,
    );
    assert.equal(progress.history.length, 1);
    assert.equal(progress.history[0]?.observedChecks, 170);
    const facts = reduceFacts(
      campaign,
      progress.current!.answers,
      progress.current!.requestedCardIds,
    );
    assert.equal(facts.segment, 'office');
    assert.equal(facts.creative, null);
    assert.equal(facts.allocation, null);
    assert.equal(facts.spent, 1500);
    assert.equal(progress.current?.cursor.lessonId, 'content');
    assert.equal(progress.current?.status, 'in_progress');
  });

  it('кнопка «пройти заново» начинает пустую попытку и оставляет итог в истории', () => {
    const played = play(campaign, PATH_A);
    const progress = replay(campaign, { current: played.attempt, history: [] }, 'fresh', at);
    assert.equal(progress.current?.answers.length, 0);
    assert.equal(progress.current?.cursor.phase, 'situation');
    assert.equal(progress.history[0]?.netContribution, 2000);
    assert.equal(emptyProgress().current, null);
  });

  it('ситуационный повод берётся из сегмента', () => {
    const lesson = getLesson(campaign, 'content');
    const step = lesson.steps.find((item) => item.type === 'assemble');
    if (!step || step.type !== 'assemble') throw new Error('нет сборки');
    const focused = step.choices.find((choice) => choice.id === 'focused');
    if (!focused) throw new Error('нет шаблона');
    const parts = assemblyParts(step, focused, lesson.segmentHooks?.office);
    assert.equal(parts[0]?.text, lesson.segmentHooks?.office);
    assert.match(parts[1]?.text ?? '', /400/);
  });
});
