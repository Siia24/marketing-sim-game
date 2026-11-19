import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { badgeArt } from '../content/art';
import { ACHIEVEMENT_COPY } from '../content/story';
import { ACHIEVEMENT_IDS } from '../engine/achievements';
import { goHome } from '../state/routes';
import { useCampaignList } from '../state/ProgressContext';
import { CatPortrait } from './CatPortrait';
import { theme } from './theme';
import { Button, Muted, Screen, Title } from './ui';

export function AchievementsScreen() {
  const router = useRouter();
  const api = useCampaignList();
  const campaign = api.campaigns[0];
  const unlocked = new Set(campaign ? api.progressFor(campaign.id).achievements : []);

  if (!api.ready) {
    return (
      <Screen>
        <Muted>Загрузка…</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <Button label="На карту" variant="ghost" onPress={() => goHome(router)} testID="signs-home" />
      <Title>Знаки</Title>
      <Muted>
        Открыто {unlocked.size} из {ACHIEVEMENT_IDS.length}. Знак загорается за сделанное и больше
        не гаснет.
      </Muted>
      <View style={styles.list}>
        {ACHIEVEMENT_IDS.map((id) => {
          const copy = ACHIEVEMENT_COPY[id];
          const open = unlocked.has(id);
          return (
            <View
              key={id}
              style={styles.row}
              testID={`achievement-${id}`}
              accessibilityLabel={`${copy.title}. ${copy.rule} ${open ? 'Открыт' : 'Пока закрыт'}`}
            >
              <CatPortrait source={badgeArt[id]} size={72} dimmed={!open} />
              <View style={styles.text}>
                <Text style={[styles.title, !open && styles.locked]}>{copy.title}</Text>
                <Text style={styles.rule}>{copy.rule}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink, fontFamily: theme.fontTitle },
  locked: { color: theme.muted },
  rule: { fontSize: 15, lineHeight: 21, color: theme.muted },
});
