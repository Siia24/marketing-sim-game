import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { topicsFor } from '../content/topics';
import type { Topic } from '../content/topics';
import type { Campaign } from '../content/types';
import type { Attempt } from '../engine/attempt';
import { lessonProgress } from '../engine/flow';
import { formatSignedMoney } from '../engine/format';
import { starRow, totalStars } from '../engine/stars';
import { lessonPath, reportPath, resumePath } from '../state/routes';
import { useCampaignList } from '../state/ProgressContext';
import { theme } from './theme';
import { Button, Card, Muted, Screen, Title } from './ui';

export function HomeScreen() {
  const router = useRouter();
  const api = useCampaignList();
  const [pending, setPending] = useState<{ campaign: Campaign; lessonId: string } | null>(null);

  if (!api.ready) {
    return (
      <Screen>
        <Muted>Загрузка…</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.kicker}>Для студентов и начинающих маркетологов</Text>
      <Title>Маркетинг-игра</Title>
      <Muted>
        Темы можно открывать в любом порядке. Звёзды остаются за лучший результат. Кейс кофейни —
        отдельная история, в которой решения складываются в один отчёт.
      </Muted>
      {api.error ? <Text style={styles.error}>{api.error}</Text> : null}
      {api.campaigns.map((campaign) => {
        const progress = api.progressFor(campaign.id);
        const attempt = progress.current;
        const topics = topicsFor(campaign);
        const tally = totalStars(
          topics.map((topic) => topic.id),
          progress.topics,
        );
        const minutes = campaign.lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);
        return (
          <View key={campaign.id} style={styles.block}>
            {topics.length > 0 ? (
              <View style={styles.block}>
                <Text
                  style={styles.total}
                  testID="map-total-stars"
                  accessibilityLabel={tallyLabel(tally)}
                >
                  Звёзды: {tally.got} из {tally.max}
                </Text>
                {topics.map((topic, index) => {
                  const run = progress.topicRun;
                  const active = run !== null && run.topicId === topic.id && run.stage !== 'result';
                  return (
                    <TopicNode
                      key={topic.id}
                      index={index}
                      topic={topic}
                      stars={progress.topics[topic.id]?.stars}
                      active={active}
                      onPress={() => router.push(`/topic/${topic.id}`)}
                    />
                  );
                })}
              </View>
            ) : null}
            <Card>
              <Text style={styles.kicker}>Кейс</Text>
              <Text style={styles.cardTitle}>{campaign.title}</Text>
              <Muted>
                {campaign.lessons.length} связанных уроков, около {minutes} минут. Цифры отчёта
                считаются только здесь. {campaign.numberNotice}
              </Muted>
              <View style={styles.lessons}>
                {campaign.lessons.map((lesson, index) => {
                  const status = lessonProgress(campaign, attempt, lesson.id);
                  return (
                    <View key={lesson.id} style={styles.lessonRow}>
                      <Text style={styles.lessonTitle}>
                        {index + 1}. {lesson.title}
                      </Text>
                      <Text style={styles.lessonMeta}>
                        {lesson.estimatedMinutes} мин · {statusLabel(status, Boolean(attempt))}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Actions
                campaign={campaign}
                attempt={attempt}
                onStart={() => {
                  const first = campaign.lessons[0];
                  if (!first) return;
                  void api
                    .start(campaign)
                    .then(() => router.push(lessonPath(campaign.id, first.id)));
                }}
                onContinue={() => {
                  if (!attempt) return;
                  router.push(resumePath(campaign.id, attempt));
                }}
                onReport={() => router.push(reportPath(campaign.id))}
                onReplay={() => {
                  const first = campaign.lessons[0];
                  if (!first) return;
                  void api.replayCampaign(campaign).then(() => {
                    router.push(lessonPath(campaign.id, first.id));
                  });
                }}
                onAskReplay={(lessonId) => setPending({ campaign, lessonId })}
              />
              {progress.history.length > 0 ? (
                <View style={styles.history}>
                  <Text style={styles.historyTitle}>Прошлые попытки</Text>
                  {progress.history.map((item) => (
                    <Text key={item.attemptId} style={styles.historyItem}>
                      {item.observedChecks === null
                        ? 'Без полного плана'
                        : `${item.observedChecks} чеков, вклад ${
                            item.netContribution === null
                              ? '—'
                              : formatSignedMoney(item.netContribution)
                          }`}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card>
          </View>
        );
      })}
      {pending ? (
        <Card>
          <Text style={styles.cardTitle}>Переиграть с этого урока?</Text>
          <Muted>
            Решения этого и следующих уроков сбросятся. Предыдущие уроки перейдут в новую попытку.
            Если кампания уже была закончена, старый итог останется в списке.
          </Muted>
          <Button
            label="Переиграть"
            testID="replay-confirm"
            onPress={() => {
              const lessonId = pending.lessonId;
              const campaign = pending.campaign;
              setPending(null);
              void api.replayLesson(campaign, lessonId).then(() => {
                router.push(lessonPath(campaign.id, lessonId));
              });
            }}
          />
          <Button label="Оставить как есть" variant="secondary" onPress={() => setPending(null)} />
        </Card>
      ) : null}
    </Screen>
  );
}

function TopicNode({
  index,
  topic,
  stars,
  active,
  onPress,
}: {
  index: number;
  topic: Topic;
  stars: number | undefined;
  active: boolean;
  onPress: () => void;
}) {
  const value = stars ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}, ${value} из 3`}
      onPress={onPress}
      testID={`map-topic-${topic.id}`}
      style={({ pressed }) => [styles.node, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{index + 1}</Text>
      </View>
      <View style={styles.nodeBody}>
        <Text style={styles.lessonTitle}>{topic.title}</Text>
        <Text style={styles.lessonMeta}>{topic.summary}</Text>
        <Text style={styles.starText}>{starRow(value)}</Text>
        <Text style={styles.lessonMeta}>{nodeStatus(stars, active)}</Text>
      </View>
    </Pressable>
  );
}

function nodeStatus(stars: number | undefined, active: boolean): string {
  if (active) return 'сейчас';
  if (stars === undefined) return 'не начата';
  return 'лучший результат';
}

function tallyLabel(tally: { got: number; max: number }): string {
  return `${tally.got} из ${tally.max}`;
}

function Actions({
  campaign,
  attempt,
  onStart,
  onContinue,
  onReport,
  onReplay,
  onAskReplay,
}: {
  campaign: Campaign;
  attempt: Attempt | null;
  onStart: () => void;
  onContinue: () => void;
  onReport: () => void;
  onReplay: () => void;
  onAskReplay: (lessonId: string) => void;
}) {
  if (!attempt) {
    return <Button label="Начать" onPress={onStart} testID="home-start" />;
  }
  if (attempt.status === 'completed') {
    return (
      <View style={styles.actions}>
        <Button label="Открыть отчёт" onPress={onReport} testID="home-report" />
        <Button label="Пройти заново" variant="secondary" onPress={onReplay} testID="home-replay" />
      </View>
    );
  }
  const canReplay = attempt.answers.length > 0 || attempt.quizAnswers.length > 0;
  return (
    <View style={styles.actions}>
      <Button label="Продолжить" onPress={onContinue} testID="home-continue" />
      {canReplay
        ? campaign.lessons
            .filter((lesson) => lessonProgress(campaign, attempt, lesson.id) !== 'locked')
            .map((lesson) => (
              <Button
                key={lesson.id}
                label={`Переиграть с урока «${lesson.title}»`}
                variant="ghost"
                onPress={() => onAskReplay(lesson.id)}
              />
            ))
        : null}
    </View>
  );
}

function statusLabel(status: 'done' | 'current' | 'locked', started: boolean): string {
  if (status === 'done') return 'пройден';
  if (status === 'current') return started ? 'сейчас' : 'старт';
  return 'дальше';
}

const styles = StyleSheet.create({
  kicker: { fontSize: 13, fontWeight: '700', color: theme.accent, letterSpacing: 0.3 },
  block: { gap: 12 },
  total: { fontSize: 16, fontWeight: '700', color: theme.ink },
  node: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 14,
  },
  pressed: { opacity: 0.86 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accentSoft,
  },
  badgeText: { fontSize: 16, fontWeight: '700', color: theme.accent },
  nodeBody: { flex: 1, gap: 4 },
  starText: { fontSize: 16, letterSpacing: 2, color: theme.accent },
  cardTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: theme.ink },
  lessons: { gap: 8 },
  lessonRow: { gap: 2 },
  lessonTitle: { fontSize: 16, color: theme.ink },
  lessonMeta: { fontSize: 13, color: theme.muted },
  actions: { gap: 8 },
  history: { gap: 4 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: theme.ink },
  historyItem: { fontSize: 14, color: theme.muted },
  error: { color: theme.badInk },
});
