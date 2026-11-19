import type { Topic } from '../content/topics';
import type { StoredProgress, TopicRun, TopicScore } from './attempt';
import { keepBest, starsFor } from './stars';

export function beginTopicRun(progress: StoredProgress, topic: Topic, at: string): StoredProgress {
  const run: TopicRun = {
    topicId: topic.id,
    stage: topic.cards.length > 0 ? 'cards' : 'practice',
    cardIndex: 0,
    practiceIndex: 0,
    answers: [],
    stars: 0,
    correctFirst: 0,
    startedAt: at,
    updatedAt: at,
    startTracked: false,
    completeTracked: false,
  };
  return { ...progress, topicRun: run };
}

export function answerTopicRun(
  progress: StoredProgress,
  topic: Topic,
  choiceId: string,
  at: string,
): StoredProgress {
  const run = progress.topicRun;
  if (!run || run.topicId !== topic.id || run.stage !== 'practice') return progress;
  const question = topic.questions[run.practiceIndex];
  if (!question || run.answers.some((answer) => answer.itemId === question.id)) return progress;
  const choice = question.choices.find((item) => item.id === choiceId);
  if (!choice) return progress;
  return {
    ...progress,
    topicRun: {
      ...run,
      stage: 'feedback',
      updatedAt: at,
      answers: [
        ...run.answers,
        { itemId: question.id, choiceId, correct: choice.correct, firstTry: true },
      ],
    },
  };
}

export function advanceTopicRun(
  progress: StoredProgress,
  topic: Topic,
  at: string,
): StoredProgress {
  const run = progress.topicRun;
  if (!run || run.topicId !== topic.id) return progress;
  if (run.stage === 'cards') {
    if (run.cardIndex + 1 < topic.cards.length) {
      return { ...progress, topicRun: { ...run, cardIndex: run.cardIndex + 1, updatedAt: at } };
    }
    return {
      ...progress,
      topicRun: { ...run, stage: 'practice', practiceIndex: 0, updatedAt: at },
    };
  }
  if (run.stage !== 'feedback') return progress;
  if (run.practiceIndex + 1 < topic.questions.length) {
    return {
      ...progress,
      topicRun: { ...run, stage: 'practice', practiceIndex: run.practiceIndex + 1, updatedAt: at },
    };
  }
  const correctFirst = run.answers.filter((answer) => answer.firstTry && answer.correct).length;
  const stars = starsFor(correctFirst, topic.questions.length);
  const score: TopicScore = {
    stars,
    correctFirst,
    graded: topic.questions.length,
    updatedAt: at,
  };
  return {
    ...progress,
    topics: { ...progress.topics, [topic.id]: keepBest(progress.topics[topic.id], score) },
    topicRun: { ...run, stage: 'result', stars, correctFirst, updatedAt: at },
  };
}
