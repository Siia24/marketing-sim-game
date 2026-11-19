import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { topicsFor } from '../src/content/topics';
import { ACHIEVEMENT_COPY, TOPIC_HOSTS } from '../src/content/story';
import { ACHIEVEMENT_IDS, earnedAchievements, mergeAchievements } from '../src/engine/achievements';
import type { TopicScore } from '../src/engine/attempt';
import { createAttempt } from '../src/engine/flow';
import { emptyProgress, parseProgress } from '../src/state/parseProgress';
import { loadCoffee } from './helpers';

const topics = topicsFor(loadCoffee()).map((topic) => topic.id);
const at = '2026-11-19T12:00:00.000Z';

describe('знаки', () => {
  it('пустой прогресс ничего не открывает, пустая карта тем тоже', () => {
    assert.deepEqual(earned(scoreMap(), false), []);
    assert.deepEqual(
      earnedAchievements({ topicIds: [], topics: { brief: score(3) }, campaignCompleted: false }),
      ['brief_stars'],
    );
    assert.deepEqual(
      earnedAchievements({ topicIds: [], topics: {}, campaignCompleted: false }),
      [],
    );
  });

  it('открывает шесть знаков по звёздам и законченному кейсу', () => {
    assert.deepEqual(earned({ brief: score(0) }, false), ['first_topic']);
    assert.deepEqual(earned({ brief: score(2) }, false), ['first_topic']);
    assert.ok(earned({ brief: score(3) }, false).includes('brief_stars'));
    assert.ok(!earned({ brief: score(2) }, false).includes('brief_stars'));
    assert.ok(earned({ report: score(3) }, false).includes('report_stars'));
    assert.ok(!earned({ report: score(2) }, false).includes('report_stars'));
    assert.ok(earned(scoreMap(), true).includes('campaign_done'));

    const allDone = Object.fromEntries(topics.map((id) => [id, score(1)]));
    const all = earned(allDone, false);
    assert.ok(all.includes('all_topics'));
    assert.ok(!all.includes('all_stars'));

    const perfect = Object.fromEntries(topics.map((id) => [id, score(3)]));
    assert.deepEqual(earned(perfect, true), [...ACHIEVEMENT_IDS]);
  });

  it('помнит уже записанные знаки и не выдаёт их снова', () => {
    const progress = {
      ...emptyProgress(),
      topics: { brief: score(3) },
      achievements: ['first_topic'],
    };
    const once = mergeAchievements(progress, topics);
    assert.deepEqual(once.fresh, ['brief_stars']);
    assert.deepEqual(once.progress.achievements, ['first_topic', 'brief_stars']);
    const twice = mergeAchievements(once.progress, topics);
    assert.deepEqual(twice.fresh, []);
    assert.equal(twice.progress, once.progress);
  });

  it('законченный кейс в истории тоже открывает знак, повтор его не стирает', () => {
    const done = {
      ...emptyProgress(),
      current: { ...createAttempt(loadCoffee(), 'old', at), status: 'completed' as const },
      achievements: ['campaign_done'],
    };
    assert.deepEqual(mergeAchievements(done, topics).fresh, []);

    const archived = {
      ...emptyProgress(),
      history: [
        {
          attemptId: 'old',
          finishedAt: at,
          status: 'completed' as const,
          observedChecks: 170,
          netContribution: 1,
          targetPassed: true,
          segment: null,
          creative: null,
        },
      ],
    };
    assert.deepEqual(mergeAchievements(archived, topics).fresh, ['campaign_done']);
  });

  it('старое сохранение без знаков читается и потом получает их по звёздам', () => {
    const parsed = parseProgress(
      JSON.stringify({
        topics: { brief: { stars: 3, correctFirst: 4, graded: 4, updatedAt: at } },
        seenIntro: 'нет',
        achievements: ['first_topic', 'нет такого', 'first_topic', 3],
      }),
    );
    assert.equal(parsed.seenIntro, false);
    assert.deepEqual(parsed.achievements, ['first_topic']);
    const merged = mergeAchievements(parsed, topics);
    assert.deepEqual(merged.fresh, ['brief_stars']);
    assert.equal(merged.progress.topics.brief?.stars, 3);
  });

  it('у каждой темы есть ведущий, у каждого знака есть правило', () => {
    for (const id of topics) {
      const host = TOPIC_HOSTS[id];
      assert.ok(host, id);
      assert.ok(host.hello.length > 0);
      assert.ok(host.bye.length > 0);
    }
    for (const id of ACHIEVEMENT_IDS) {
      assert.ok(ACHIEVEMENT_COPY[id].title.length > 0);
      assert.ok(ACHIEVEMENT_COPY[id].rule.length > 0);
    }
  });
});

function earned(scores: Record<string, TopicScore>, campaignCompleted: boolean) {
  return earnedAchievements({ topicIds: topics, topics: scores, campaignCompleted });
}

function scoreMap(): Record<string, TopicScore> {
  return {};
}

function score(stars: number): TopicScore {
  return { stars, correctFirst: stars, graded: 4, updatedAt: at };
}
