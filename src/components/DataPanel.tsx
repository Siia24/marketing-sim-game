import { StyleSheet, Text, View } from 'react-native';
import type { DataCard } from '../content/types';
import type { GameFacts } from '../engine/facts';
import type { SimulationResult } from '../engine/simulate';
import { PlayerNumbers } from './Numbers';
import { theme } from './theme';
import { Button } from './ui';

export function DataPanel({
  cards,
  facts,
  result,
  onRequest,
}: {
  cards: DataCard[];
  facts: GameFacts;
  result: SimulationResult | null;
  onRequest: (cardId: string) => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Данные</Text>
      {cards.map((card) => {
        const hidden = Boolean(card.requestLabel) && !facts.revealed.includes(card.id);
        return (
          <View key={card.id} style={styles.card}>
            <Text style={styles.title}>{card.title}</Text>
            {hidden ? (
              <Button
                label={card.requestLabel ?? 'Показать'}
                variant="secondary"
                onPress={() => onRequest(card.id)}
                testID={`request-${card.id}`}
              />
            ) : (
              <View style={styles.body}>
                <Text style={styles.text}>{card.text}</Text>
                {card.binding === 'playerReport' && result ? (
                  <PlayerNumbers result={result} facts={facts} />
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  heading: { fontSize: 13, fontWeight: '700', color: theme.muted, letterSpacing: 0.4 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 14,
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '700', color: theme.ink },
  body: { gap: 8 },
  text: { fontSize: 15, lineHeight: 22, color: theme.ink },
});
