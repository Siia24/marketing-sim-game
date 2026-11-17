import { StyleSheet, Text, View } from 'react-native';
import type { Speaker } from '../content/types';
import { theme } from './theme';
import { Button } from './ui';

export function FeedbackCard({
  reply,
  paragraphs,
  advance,
  continueLabel,
  onContinue,
}: {
  reply?: Speaker;
  paragraphs: string[];
  advance: boolean;
  continueLabel: string;
  onContinue: () => void;
}) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.card, advance ? styles.ok : styles.back]}>
      <Text style={styles.kicker}>{advance ? 'Можно идти дальше' : 'Пока рано'}</Text>
      {reply ? (
        <View style={styles.reply}>
          <Text style={styles.speaker}>{reply.speaker}</Text>
          <Text style={styles.text}>{reply.text}</Text>
        </View>
      ) : null}
      {paragraphs.map((paragraph) => (
        <Text key={paragraph} style={styles.text}>
          {paragraph}
        </Text>
      ))}
      <Button label={continueLabel} onPress={onContinue} testID="feedback-continue" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, gap: 10, borderWidth: 1 },
  ok: { backgroundColor: theme.okBg, borderColor: '#bbf7d0' },
  back: { backgroundColor: theme.warnBg, borderColor: '#fed7aa' },
  kicker: { fontSize: 13, fontWeight: '700', color: theme.muted },
  reply: { gap: 4 },
  speaker: { fontSize: 13, fontWeight: '700', color: theme.ink },
  text: { fontSize: 16, lineHeight: 24, color: theme.ink },
});
