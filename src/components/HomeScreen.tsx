import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ACHIEVEMENT_IDS } from '../engine/achievements';
import { catArt } from '../content/art';
import { topicsFor } from '../content/topics';
import type { Campaign } from '../content/types';
import { CAMPAIGN_LINE, catById } from '../content/story';
import type { Attempt } from '../engine/attempt';
import { lessonProgress } from '../engine/flow';
import { formatSignedMoney } from '../engine/format';
import { totalStars } from '../engine/stars';
import { lessonPath, reportPath, resumePath } from '../state/routes';
import { useCampaignList } from '../state/ProgressContext';
import { CatPortrait } from './CatPortrait';
import { IntroScreen } from './IntroScreen';
import { theme } from './theme';
import { TopicMap } from './TopicMap';
import { Button, Card, Muted, Screen, Title } from './ui';

export function HomeScreen() {
  const router = useRouter();
  const api = useCampaignList();
  const [pending, setPending] = useState<{ campaign: Campaign; lessonId: string } | null>(null);
  const [showStory, setShowStory] = useState(false);
  const [leftIntro, setLeftIntro] = useState(false);
  const campaign = api.campaigns[0];
  const progress = campaign ? api.progressFor(campaign.id) : null;

  if (!api.ready) {
    return (
      <Screen>
        <Muted>Загрузка…</Muted>
      </Screen>
    );
  }

  const showIntro = showStory || Boolean(progress && !progress.seenIntro && !leftIntro);
  if (showIntro) {
    return (
      <IntroScreen
        continueLabel={progress?.seenIntro ? 'На карту' : 'В путь'}
        onContinue={() => {
          setShowStory(false);
          setLeftIntro(true);
          if (campaign && progress && !progress.seenIntro) void api.seeIntro(campaign.id);
        }}
      />
    );
  }

  return (
    <Screen>
      <Text style={styles.kicker}>Для студентов и начинающих маркетологов</Text>
      <Title>Маркетинг-игра</Title>
      {api.error ? <Text style={styles.error}>{api.error}</Text> : null}
      {api.campaigns.map((item) => {
        const saved = api.progressFor(item.id);
        const attempt = saved.current;
        const topics = topicsFor(item);
        const tally = totalStars(
          topics.map((topic) => topic.id),
          saved.topics,
        );
        const active =
          saved.topicRun && saved.topicRun.stage !== 'result' ? saved.topicRun.topicId : null;
        const minutes = item.lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);
        const guide = catById('mira');
        return (
          <View key={item.id} style={styles.block}>
            {topics.length > 0 ? (
              <View style={styles.block}>
                <View style={styles.header}>
                  <Text
                    style={styles.total}
                    testID="map-total-stars"
                    accessibilityLabel={`${tally.got} из ${tally.max}`}
                  >
                    Звёзды: {tally.got} из {tally.max}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Знаки, открыто ${saved.achievements.length} из ${ACHIEVEMENT_IDS.length}`}
                    onPress={() => router.push('/achievements')}
                    testID="open-achievements"
                    style={({ pressed }) => [styles.signs, pressed && styles.pressed]}
                  >
                    <Text style={styles.signsText}>
                      Знаки {saved.achievements.length}/{ACHIEVEMENT_IDS.length}
                    </Text>
                  </Pressable>
                </View>
                <TopicMap
                  topics={topics}
                  scores={saved.topics}
                  activeTopicId={active}
                  onOpen={(topicId) => router.push(`/topic/${topicId}`)}
                />
                <Button label="Кто с вами" variant="ghost" onPress={() => setShowStory(true)} />
              </View>
            ) : null}
            <Card>
              <View style={styles.host}>
                <CatPortrait source={catArt.mira} size={56} />
                <View style={styles.hostText}>
                  <Text style={styles.kicker}>{guide.name}</Text>
                  <Text style={styles.hostLine}>{CAMPAIGN_LINE}</Text>
                </View>
              </View>
              <Text style={styles.kicker}>Кейс</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Muted>
                {item.lessons.length} связанных уроков, около {minutes} минут. Цифры отчёта
                считаются только здесь. {item.numberNotice}
              </Muted>
              <View style={styles.lessons}>
                {item.lessons.map((lesson, index) => {
                  const status = lessonProgress(item, attempt, lesson.id);
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
                campaign={item}
                attempt={attempt}
                onStart={() => {
                  const first = item.lessons[0];
                  if (!first) return;
                  void api.start(item).then(() => router.push(lessonPath(item.id, first.id)));
                }}
                onContinue={() => {
                  if (!attempt) return;
                  router.push(resumePath(item.id, attempt));
                }}
                onReport={() => router.push(reportPath(item.id))}
                onReplay={() => {
                  const first = item.lessons[0];
                  if (!first) return;
                  void api.replayCampaign(item).then(() => {
                    router.push(lessonPath(item.id, first.id));
                  });
                }}
                onAskReplay={(lessonId) => setPending({ campaign: item, lessonId })}
              />
              {saved.history.length > 0 ? (
                <View style={styles.history}>
                  <Text style={styles.historyTitle}>Прошлые попытки</Text>
                  {saved.history.map((entry) => (
                    <Text key={entry.attemptId} style={styles.historyItem}>
                      {entry.observedChecks === null
                        ? 'Без полного плана'
                        : `${entry.observedChecks} чеков, вклад ${
                            entry.netContribution === null
                              ? '—'
                              : formatSignedMoney(entry.netContribution)
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
              const chosen = pending.campaign;
              setPending(null);
              void api.replayLesson(chosen, lessonId).then(() => {
                router.push(lessonPath(chosen.id, lessonId));
              });
            }}
          />
          <Button label="Оставить как есть" variant="secondary" onPress={() => setPending(null)} />
        </Card>
      ) : null}
    </Screen>
  );
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
  kicker: { fontSize: 13, fontWeight: '700', color: theme.gold, letterSpacing: 0.3 },
  block: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  total: { fontSize: 16, fontWeight: '700', color: theme.ink },
  signs: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.gold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.card,
  },
  signsText: { color: theme.gold, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.86 },
  host: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  hostText: { flex: 1, gap: 4 },
  hostLine: { fontSize: 15, lineHeight: 21, color: theme.ink },
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
