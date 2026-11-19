import { StyleSheet, Text } from 'react-native';
import { Rise } from './Rise';
import { theme } from './theme';

export function StarMark({
  value,
  size = 16,
  celebrate = false,
}: {
  value: number;
  size?: number;
  celebrate?: boolean;
}) {
  const filled = Math.max(0, Math.min(3, Math.trunc(value)));
  const mark = (
    <Text accessibilityLabel={`${filled} из 3`} style={[styles.row, { fontSize: size }]}>
      <Text style={styles.filled}>{'★'.repeat(filled)}</Text>
      <Text style={styles.empty}>{'☆'.repeat(3 - filled)}</Text>
    </Text>
  );
  if (!celebrate) return mark;
  return <Rise>{mark}</Rise>;
}

const styles = StyleSheet.create({
  row: { letterSpacing: 1 },
  filled: { color: theme.gold },
  empty: { color: theme.emptyStar },
});
