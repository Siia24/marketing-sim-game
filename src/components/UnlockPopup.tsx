import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { badgeArt } from '../content/art';
import { ACHIEVEMENT_COPY } from '../content/story';
import { useCampaignList } from '../state/ProgressContext';
import { CatPortrait } from './CatPortrait';
import { Rise } from './Rise';
import { theme } from './theme';
import { Button } from './ui';

export function UnlockPopup() {
  const api = useCampaignList();
  const campaign = api.campaigns[0];
  const seenIntro = campaign ? api.progressFor(campaign.id).seenIntro : false;
  const id = api.unlockQueue[0];
  if (!id || !seenIntro) return null;
  const copy = ACHIEVEMENT_COPY[id];

  return (
    <Modal transparent visible animationType="none" onRequestClose={api.dismissUnlock}>
      <Pressable style={styles.backdrop} onPress={api.dismissUnlock}>
        <Rise key={id}>
          <Pressable testID="unlock-popup" style={styles.card} onPress={() => undefined}>
            <Text style={styles.kicker}>Знак открыт</Text>
            <View style={styles.badge}>
              <CatPortrait source={badgeArt[id]} size={120} />
            </View>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.rule}>{copy.rule}</Text>
            <Button label="Хорошо" onPress={api.dismissUnlock} testID="unlock-dismiss" />
          </Pressable>
        </Rise>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 4, 16, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.gold,
    padding: 20,
    gap: 8,
  },
  kicker: { fontSize: 13, fontWeight: '700', color: theme.gold, textAlign: 'center' },
  badge: { alignItems: 'center', marginVertical: 8 },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: theme.ink,
    textAlign: 'center',
    fontFamily: theme.fontTitle,
  },
  rule: { fontSize: 16, lineHeight: 22, color: theme.muted, textAlign: 'center' },
});
