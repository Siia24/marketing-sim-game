import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AssembleStep } from '../content/types';
import { assemblyParts } from '../engine/assemble';
import { theme } from './theme';
import { Button } from './ui';

export function AssembleEditor({
  step,
  segmentHook,
  onConfirm,
}: {
  step: AssembleStep;
  segmentHook: string | undefined;
  onConfirm: (choiceId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(step.choices[0]?.id ?? '');
  const choice = step.choices.find((item) => item.id === selectedId) ?? step.choices[0];
  const parts = choice ? assemblyParts(step, choice, segmentHook) : [];

  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={styles.prompt} testID="step-prompt">
        {step.prompt}
      </Text>
      <Text style={styles.instruction}>{step.instruction}</Text>
      {step.choices.map((item) => (
        <Button
          key={item.id}
          label={item.label}
          variant="secondary"
          selected={item.id === choice?.id}
          onPress={() => setSelectedId(item.id)}
          testID={`assemble-${item.id}`}
        />
      ))}
      <View style={styles.preview}>
        {parts.map((part) => (
          <View key={part.slotId} style={styles.part}>
            <Text style={styles.partLabel}>{part.label}</Text>
            <Text testID={`part-${part.slotId}`} style={styles.partText}>
              {part.text}
            </Text>
          </View>
        ))}
      </View>
      <Button
        label="Подтвердить текст"
        onPress={() => choice && onConfirm(choice.id)}
        testID="assemble-confirm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  prompt: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: theme.ink },
  instruction: { fontSize: 15, lineHeight: 22, color: theme.muted },
  preview: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 12,
    gap: 10,
  },
  part: { gap: 2 },
  partLabel: { fontSize: 12, fontWeight: '700', color: theme.muted },
  partText: { fontSize: 16, lineHeight: 22, color: theme.ink },
});
