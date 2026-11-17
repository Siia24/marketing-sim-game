import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Campaign } from '../content/types';
import { lessonProgress } from '../engine/flow';
import { formatSignedMoney } from '../engine/format';
import type { Attempt } from '../engine/attempt';
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
        Вы — маркетолог. За одну короткую кампанию договариваетесь с владельцем, выбираете, кого
        звать, собираете публикацию и смотрите, что можно честно сказать по кассе. Ошибку видно
        сразу, и её можно переиграть.
      </Muted>
      {api.error ? <Text style={styles.error}>{api.error}</Text> : null}
      {api.campaigns.map((campaign) => {
        const progress = api.progressFor(campaign.id);
        const attempt = progress.current;
        const minutes = campaign.lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);
        return (
          <Card key={campaign.id}>
            <Text style={styles.cardTitle}>{campaign.title}</Text>
            <Muted>
              {campaign.lessons.length} уроков, около {minutes} минут. {campaign.numberNotice}
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
                void api.start(campaign).then(() => router.push(lessonPath(campaign.id, first.id)));
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
