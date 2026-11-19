import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { catArt } from '../content/art';
import { findTopic } from '../content/topics';
import type { Topic, TopicChoice } from '../content/topics';
import { hostFor } from '../content/story';
import type { TopicRun } from '../engine/attempt';
import { goHome } from '../state/routes';
import { useCampaign } from '../state/ProgressContext';
import { CatPortrait } from './CatPortrait';
import { StarMark } from './StarMark';
import { theme } from './theme';
import { Button, Card, Muted, Screen, Title } from './ui';

export function TopicScreen({ topicId }: { topicId: string }) {
  const router = useRouter();
  const found = findTopic(topicId);
  const api = useCampaign(found?.campaign.id ?? '');

  if (!api.ready) {
    return (
      <Screen>
        <Muted>Загрузка…</Muted>
      </Screen>
    );
  }
  if (!found) {
    return (
      <Screen>
        <Title>Такой темы нет</Title>
        <Button label="На карту" onPress={() => goHome(router)} />
      </Screen>
    );
  }

  const { topic, campaign } = found;
  const progress = api.progressFor(campaign.id);
  const score = progress.topics[topic.id];
  const run = progress.topicRun?.topicId === topic.id ? progress.topicRun : null;

  return (
    <Screen>
      <Button label="На карту" variant="ghost" onPress={() => goHome(router)} testID="topic-home" />
      {api.error ? <Text style={styles.error}>{api.error}</Text> : null}
      {run && run.stage !== 'result' ? <HostChip topicId={topic.id} /> : null}
      <Muted>
        {topic.minutes} мин · {topic.sourcesLabel}
      </Muted>
      <Title>{topic.title}</Title>
      {!run ? (
        <Intro
          topic={topic}
          notice={campaign.numberNotice}
          stars={score?.stars}
          onStart={() => void api.beginTopic(topic.id)}
        />
      ) : null}
      {run?.stage === 'cards' ? (
        <Cards topic={topic} run={run} onNext={() => void api.advanceTopic(topic.id)} />
      ) : null}
      {run && (run.stage === 'practice' || run.stage === 'feedback') ? (
        <Practice
          topic={topic}
          run={run}
          onAnswer={(choiceId) => void api.answerTopic(topic.id, choiceId)}
          onNext={() => void api.advanceTopic(topic.id)}
        />
      ) : null}
      {run?.stage === 'result' ? (
        <Result
          topic={topic}
          run={run}
          best={score?.stars ?? run.stars}
          onHome={() => goHome(router)}
          onRetry={() => void api.beginTopic(topic.id)}
        />
      ) : null}
    </Screen>
  );
}

function Intro({
  topic,
  notice,
  stars,
  onStart,
}: {
  topic: Topic;
  notice: string;
  stars: number | undefined;
  onStart: () => void;
}) {
  return (
    <View style={styles.block}>
      <HostLine topicId={topic.id} moment="hello" />
      <Text style={styles.body}>{topic.summary}</Text>
      {topic.summaryNeedsCheck ? (
        <Muted>Короткая формулировка взята из пакета кампании. Её стоит сверить с учебником.</Muted>
      ) : null}
      <Muted>{notice}</Muted>
      {stars === undefined ? (
        <Text style={styles.stars}>Пока без звёзд</Text>
      ) : (
        <View style={styles.best}>
          <Text style={styles.stars}>Лучший результат</Text>
          <StarMark value={stars} />
        </View>
      )}
      <Muted>Звёзды считаются по ответам до подсказки. Тему можно пройти заново.</Muted>
      <Button
        label={stars === undefined ? 'Начать' : 'Пройти заново'}
        onPress={onStart}
        testID="topic-start"
      />
    </View>
  );
}

function Cards({ topic, run, onNext }: { topic: Topic; run: TopicRun; onNext: () => void }) {
  const card = topic.cards[run.cardIndex];
  if (!card) {
    return <Button label="К вопросам" onPress={onNext} testID="topic-continue" />;
  }
  return (
    <View style={styles.block}>
      <Muted>
        Карточка {run.cardIndex + 1} из {topic.cards.length}
      </Muted>
      <Card>
        <Text style={styles.section}>{card.title}</Text>
        {card.lines.map((line) => (
          <View key={`${line.speaker ?? ''}-${line.text}`} style={styles.line}>
            {line.speaker ? <Text style={styles.speaker}>{line.speaker}</Text> : null}
            <Text style={styles.body}>{line.text}</Text>
          </View>
        ))}
        {card.needsCheck ? (
          <Muted>Заголовок этой карточки стоит сверить с учебником. Текст ниже — из урока.</Muted>
        ) : null}
      </Card>
      <Button label="Дальше" onPress={onNext} testID="topic-continue" />
    </View>
  );
}

function Practice({
  topic,
  run,
  onAnswer,
  onNext,
}: {
  topic: Topic;
  run: TopicRun;
  onAnswer: (choiceId: string) => void;
  onNext: () => void;
}) {
  const question = topic.questions[run.practiceIndex];
  if (!question) {
    return <Button label="К результату" onPress={onNext} testID="topic-continue" />;
  }
  const saved = run.answers.find((answer) => answer.itemId === question.id);
  const choice = saved ? question.choices.find((item) => item.id === saved.choiceId) : undefined;
  const last = run.practiceIndex + 1 >= topic.questions.length;
  return (
    <View style={styles.block}>
      <Muted>
        Вопрос {run.practiceIndex + 1} из {topic.questions.length}
      </Muted>
      {run.practiceIndex === 0 && run.stage === 'practice' ? (
        <Muted>Засчитывается ответ до подсказки.</Muted>
      ) : null}
      <Text accessibilityRole="header" style={styles.section} testID="topic-prompt">
        {question.prompt}
      </Text>
      {question.sourcesLabel ? <Muted>{question.sourcesLabel}</Muted> : null}
      {run.stage === 'practice' && !saved
        ? question.choices.map((item) => (
            <Button
              key={item.id}
              label={item.label}
              variant="secondary"
              testID={`topic-choice-${item.id}`}
              onPress={() => onAnswer(item.id)}
            />
          ))
        : null}
      {saved && choice ? (
        <Feedback choice={choice} correct={saved.correct} last={last} onNext={onNext} />
      ) : null}
    </View>
  );
}

function Feedback({
  choice,
  correct,
  last,
  onNext,
}: {
  choice: TopicChoice;
  correct: boolean;
  last: boolean;
  onNext: () => void;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.feedback, correct ? styles.ok : styles.miss]}
    >
      <Text style={styles.kicker}>{correct ? 'Верно' : 'Неверно. Можно продолжить.'}</Text>
      {choice.reply ? (
        <Text style={styles.body}>
          {choice.reply.speaker}: {choice.reply.text}
        </Text>
      ) : null}
      <Text style={styles.body}>{choice.feedback}</Text>
      <Button label={last ? 'К результату' : 'Дальше'} onPress={onNext} testID="topic-continue" />
    </View>
  );
}

function Result({
  topic,
  run,
  best,
  onHome,
  onRetry,
}: {
  topic: Topic;
  run: TopicRun;
  best: number;
  onHome: () => void;
  onRetry: () => void;
}) {
  return (
    <View style={styles.block} testID="topic-result">
      <Text style={styles.section}>Тема пройдена</Text>
      <HostLine topicId={topic.id} moment="bye" />
      <View testID="topic-stars">
        <StarMark value={run.stars} size={32} celebrate />
      </View>
      <Text style={styles.body}>
        Верно до подсказки: {run.correctFirst} из {topic.questions.length}.
      </Text>
      <View style={styles.best}>
        <Text style={styles.body}>Лучший результат</Text>
        <StarMark value={best} />
      </View>
      {run.stars < best ? <Muted>Этот заход не улучшил результат.</Muted> : null}
      <Button label="На карту" onPress={onHome} testID="topic-done" />
      <Button label="Пройти заново" variant="secondary" onPress={onRetry} testID="topic-retry" />
    </View>
  );
}

function HostChip({ topicId }: { topicId: string }) {
  const host = hostFor(topicId);
  if (!host) return null;
  return (
    <View style={styles.host}>
      <CatPortrait source={catArt[host.catId]} size={48} />
      <Text style={styles.hostName}>{host.cat.name}</Text>
    </View>
  );
}

function HostLine({ topicId, moment }: { topicId: string; moment: 'hello' | 'bye' }) {
  const host = hostFor(topicId);
  if (!host) return null;
  return (
    <View style={styles.host}>
      <CatPortrait source={catArt[host.catId]} size={64} />
      <View style={styles.hostText}>
        <Text style={styles.hostName}>{host.cat.name}</Text>
        <Text style={styles.body}>{moment === 'hello' ? host.hello : host.bye}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  section: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: theme.ink },
  body: { fontSize: 16, lineHeight: 24, color: theme.ink },
  line: { gap: 4 },
  speaker: { fontSize: 13, fontWeight: '700', color: theme.muted },
  stars: { fontSize: 16, color: theme.muted },
  best: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  host: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  hostText: { flex: 1, gap: 4 },
  hostName: { fontSize: 16, fontWeight: '700', color: theme.gold, fontFamily: theme.fontTitle },
  feedback: { borderRadius: 14, padding: 16, gap: 10, borderWidth: 1 },
  ok: { backgroundColor: theme.okBg, borderColor: theme.okLine },
  miss: { backgroundColor: theme.warnBg, borderColor: theme.warnLine },
  kicker: { fontSize: 13, fontWeight: '700', color: theme.muted },
  error: { color: theme.badInk },
});
