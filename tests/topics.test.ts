import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { topicsFor } from '../src/content/topics';
import { createAttempt, replay } from '../src/engine/flow';
import { advanceTopicRun, answerTopicRun, beginTopicRun } from '../src/engine/topicFlow';
import { emptyProgress } from '../src/state/parseProgress';
import { loadCoffee } from './helpers';

const campaign = loadCoffee();
const at = '2026-11-19T12:00:00.000Z';
const SERVICE = /trackingEnabled|baselineEnabled|attemptId|CTR\/CVR/;

describe('темы карты', () => {
  const topics = topicsFor(campaign);

  it('собирает шесть тем из уже написанных уроков', () => {
    assert.deepEqual(
      topics.map((topic) => topic.id),
      ['brief', 'audience', 'content', 'bloggers', 'media', 'report'],
    );
    const prompts = new Set<string>();
    for (const lesson of campaign.lessons) {
      for (const question of lesson.quiz.questions) prompts.add(question.prompt);
      for (const step of lesson.steps) {
        if (step.type === 'choice') prompts.add(step.prompt);
      }
    }
    const seen = new Set<string>();
    for (const topic of topics) {
      assert.ok(topic.cards.length >= 2, topic.id);
      assert.ok(topic.questions.length >= 3, topic.id);
      assert.equal(topic.questions.filter((q) => seen.has(q.id)).length, 0, topic.id);
      for (const question of topic.questions) {
        seen.add(question.id);
        assert.ok(prompts.has(question.prompt), question.id);
        assert.equal(question.choices.filter((choice) => choice.correct).length, 1);
        assert.doesNotMatch(question.prompt, SERVICE);
        for (const choice of question.choices) assert.doesNotMatch(choice.feedback, SERVICE);
      }
      for (const card of topic.cards) {
        assert.ok(card.lines.every((line) => line.text.length > 0));
        for (const line of card.lines) assert.doesNotMatch(line.text, SERVICE);
      }
    }
    assert.equal(seen.size, 22);
  });

  it('помечает только новые связки, которых не было дословной строкой урока', () => {
    const checked = topics.filter((topic) => topic.summaryNeedsCheck).map((topic) => topic.id);
    assert.deepEqual(checked, ['bloggers', 'media']);
    const rule = topics
      .find((topic) => topic.id === 'media')
      ?.cards.find((card) => card.needsCheck);
    assert.equal(
      rule?.lines[0]?.text,
      'У города дешёвый показ, но только 5% показов рядом с кофейней. Посмотрите прогноз не по всем показам, а по релевантным.',
    );
  });

  it('считает звёзды захода и не понижает лучший результат', () => {
    const topic = topics.find((item) => item.id === 'bloggers');
    assert.ok(topic);
    let progress = finish(topic, false);
    assert.equal(progress.topicRun?.stars, 0);
    assert.equal(progress.topics.bloggers?.stars, 0);
    progress = finish(topic, true, progress);
    assert.equal(progress.topicRun?.stars, 3);
    assert.equal(progress.topics.bloggers?.stars, 3);
    progress = finish(topic, false, progress);
    assert.equal(progress.topicRun?.stars, 0);
    assert.equal(progress.topics.bloggers?.stars, 3);
  });

  it('повтор кейса не стирает звёзды', () => {
    const progress = replay(
      campaign,
      {
        ...emptyProgress(),
        current: createAttempt(campaign, 'done', at),
        topics: { brief: { stars: 2, correctFirst: 3, graded: 4, updatedAt: at } },
      },
      'fresh',
      at,
    );
    assert.equal(progress.topics.brief?.stars, 2);
    assert.equal(progress.current?.answers.length, 0);
  });
});

function finish(
  topic: NonNullable<ReturnType<typeof topicsFor>[number]>,
  correct: boolean,
  initial = emptyProgress(),
) {
  let progress = beginTopicRun(initial, topic, at);
  while (progress.topicRun && progress.topicRun.stage !== 'result') {
    const run = progress.topicRun;
    if (run.stage === 'cards') {
      progress = advanceTopicRun(progress, topic, at);
      continue;
    }
    if (run.stage === 'feedback') {
      progress = advanceTopicRun(progress, topic, at);
      continue;
    }
    const question = topic.questions[run.practiceIndex];
    assert.ok(question);
    const choice = question.choices.find((item) => item.correct === correct);
    assert.ok(choice);
    progress = answerTopicRun(progress, topic, choice.id, at);
  }
  return progress;
}
