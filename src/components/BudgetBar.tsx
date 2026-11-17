import { StyleSheet, Text, View } from 'react-native';
import type { GameFacts } from '../engine/facts';
import { formatMoney } from '../engine/format';
import { theme } from './theme';

export function BudgetBar({ facts }: { facts: GameFacts }) {
  const reserve = facts.budgetLimit - facts.spent;
  return (
    <View
      style={styles.bar}
      accessibilityLabel={`Бюджет, условно. Потрачено ${facts.spent} из ${facts.budgetLimit} рублей. Резерв ${reserve}.`}
    >
      <Text style={styles.label}>Бюджет, условно</Text>
      <Text style={styles.value}>
        Потрачено {formatMoney(facts.spent)} из {formatMoney(facts.budgetLimit)}
      </Text>
      <Text style={styles.reserve}>Резерв {formatMoney(reserve)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 12,
    gap: 2,
  },
  label: { color: theme.muted, fontSize: 13 },
  value: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  reserve: { color: theme.muted, fontSize: 14 },
});
