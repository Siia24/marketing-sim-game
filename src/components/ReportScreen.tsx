import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { Campaign } from '../content/types';
import { formatSignedMoney } from '../engine/format';
import { lessonPath, resumePath } from '../state/routes';
import { useCampaign } from '../state/ProgressContext';
import { ModelNumbers, PlayerNumbers } from './Numbers';
import { theme } from './theme';
import { Button, Card, Muted, Screen, Title } from './ui';

export function ReportScreen({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const api = useCampaign(campaignId);
  const { ready, campaign, attempt, facts, result, progress } = api;

  if (!ready) {
    return (
      <Screen>
        <Muted>Загрузка…</Muted>
      </Screen>
    );
  }
  if (!campaign || !attempt || !facts) {
    return (
      <Screen>
        <Title>Отчёта пока нет</Title>
        <Button label="На главную" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  if (attempt.status !== 'completed' || !result) {
    return <Redirect href={resumePath(campaign.id, attempt)} />;
  }

  const debrief = findDebrief(campaign);
  const firstLesson = campaign.lessons[0];

  return (
    <Screen>
      <Button label="К списку" variant="ghost" onPress={() => router.push('/')} />
      <Muted>Кампания «{campaign.title}»</Muted>
      <Title>Отчёт для владельца</Title>
      <Text style={styles.notice}>{campaign.numberNotice}</Text>
      <Card>
        <PlayerNumbers result={result} facts={facts} />
      </Card>
      <Card>
        {debrief ? (
          <View style={styles.block}>
            <Text style={styles.section}>{debrief.prompt}</Text>
            <Text style={styles.body}>{debrief.text}</Text>
          </View>
        ) : null}
        <ModelNumbers result={result} assumptions={campaign.simulation.assumptions} />
      </Card>
      {progress.history.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.section}>Прошлые попытки</Text>
          {progress.history.map((item) => (
            <Text key={item.attemptId} style={styles.body}>
              {item.observedChecks === null
                ? 'Попытка без полного плана'
                : `${item.observedChecks} чеков, вклад ${
                    item.netContribution === null ? '—' : formatSignedMoney(item.netContribution)
                  }, цель ${item.targetPassed ? 'достигнута' : 'не достигнута'}`}
            </Text>
          ))}
        </View>
      ) : null}
      <Button
        label="Пройти заново"
        testID="report-replay"
        onPress={() => {
          if (!firstLesson) return;
          void api.replayCampaign(campaign).then(() => {
            router.replace(lessonPath(campaign.id, firstLesson.id));
          });
        }}
      />
    </Screen>
  );
}

function findDebrief(campaign: Campaign): { prompt: string; text: string } | null {
  for (const lesson of campaign.lessons) {
    for (const step of lesson.steps) {
      if (step.type === 'debrief') return { prompt: step.prompt, text: step.text };
    }
  }
  return null;
}

const styles = StyleSheet.create({
  notice: { fontSize: 13, lineHeight: 18, color: theme.muted },
  block: { gap: 8 },
  section: { fontSize: 18, fontWeight: '700', color: theme.ink },
  body: { fontSize: 16, lineHeight: 24, color: theme.ink },
});
