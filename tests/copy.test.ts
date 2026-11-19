import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Lesson } from '../src/content/types';
import { loadCoffee } from './helpers';

const SERVICE = /trackingEnabled|baselineEnabled|attemptId|CTR\/CVR/;

describe('тексты, которые видит игрок', () => {
  it('не содержат служебных имён из кода', () => {
    for (const lesson of loadCoffee().lessons) {
      assert.doesNotMatch(lesson.carryForward, SERVICE, lesson.id);
      for (const card of lesson.data) {
        assert.doesNotMatch(card.text, SERVICE, card.id);
      }
      for (const step of lesson.steps) {
        if ('text' in step && typeof step.text === 'string') {
          assert.doesNotMatch(step.text, SERVICE, step.id);
        }
      }
    }
  });

  it('кнопка повтора в разборе называется так же, как на экране', () => {
    const report = loadCoffee().lessons.find((lesson) => lesson.id === 'report');
    const debrief = report ? debriefText(report) : '';
    assert.match(debrief, /Пройти заново/);
    assert.doesNotMatch(debrief, /Пройти ещё раз/);
  });
});

function debriefText(lesson: Lesson): string {
  for (const step of lesson.steps) {
    if (step.type === 'debrief') return step.text;
  }
  return '';
}
