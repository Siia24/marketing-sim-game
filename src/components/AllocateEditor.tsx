import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AllocateStep, Campaign } from '../content/types';
import type { GameFacts } from '../engine/facts';
import { formatClicks, formatCount, formatMoney } from '../engine/format';
import { simulateCoffeeV1, type SimulationResult } from '../engine/simulate';
import { theme } from './theme';
import { Button } from './ui';

export function AllocateEditor({
  campaign,
  step,
  facts,
  onConfirm,
}: {
  campaign: Campaign;
  step: AllocateStep;
  facts: GameFacts;
  onConfirm: (input: Record<string, number>) => Promise<string | null>;
}) {
  const channels = step.input.channels;
  const [units, setUnits] = useState<Record<string, number>>(() =>
    Object.fromEntries(channels.map((channel) => [channel, 0])),
  );
  const [error, setError] = useState<string | null>(null);
  const total = channels.reduce((sum, channel) => sum + (units[channel] ?? 0), 0);
  const draftCost = facts.spent + total * step.input.unitCost;
  const reserve = facts.budgetLimit - draftCost;
  const forecast = forecastFor(campaign, facts, units);

  function change(channel: string, delta: number) {
    setError(null);
    setUnits((current) => ({ ...current, [channel]: (current[channel] ?? 0) + delta }));
  }

  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={styles.prompt} testID="step-prompt">
        {step.prompt}
      </Text>
      {channels.map((channel) => {
        const meta = campaign.simulation.channels[channel];
        const value = units[channel] ?? 0;
        const max = step.input.maxUnitsByChannel[channel] ?? 0;
        const canDec = value > step.input.minUnits;
        const nextCost = facts.spent + (total + 1) * step.input.unitCost;
        const canInc =
          value < max &&
          total + 1 <= campaign.simulation.maxUnitsTotal &&
          nextCost <= facts.budgetLimit;
        return (
          <View key={channel} style={styles.channel}>
            <Text style={styles.channelTitle}>{meta?.label ?? channel}</Text>
            {meta ? (
              <Text style={styles.channelMeta}>
                {formatCount(meta.impressionsPerUnit)} показов за пакет · рядом{' '}
                {Math.round(meta.localShare * 100)}% · до {max}
              </Text>
            ) : null}
            <View style={styles.stepper}>
              <Stepper
                label={`Меньше пакетов: ${meta?.label ?? channel}`}
                disabled={!canDec}
                onPress={() => change(channel, -1)}
                testID={`alloc-${channel}-dec`}
                text="−"
              />
              <Text style={styles.count} testID={`alloc-${channel}-value`}>
                {value}
              </Text>
              <Stepper
                label={`Больше пакетов: ${meta?.label ?? channel}`}
                disabled={!canInc}
                onPress={() => change(channel, 1)}
                testID={`alloc-${channel}-inc`}
                text="+"
              />
            </View>
          </View>
        );
      })}
      <Text style={styles.summary}>
        Полные расходы, условно: {formatMoney(draftCost)}. Резерв:{' '}
        {formatMoney(Math.max(reserve, 0))}.
      </Text>
      {forecast ? (
        <View style={styles.forecast}>
          <Text style={styles.forecastTitle}>Прогноз оплат, условно: {forecast.added}</Text>
          {forecast.rows.map((row) => (
            <Text key={row.channel} style={styles.forecastRow}>
              {row.label}: {formatCount(row.impressions)} показов → {formatCount(row.relevant)}{' '}
              релевантных → {formatClicks(row.clicks)} → {row.paid} оплат
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.channelMeta}>
          Прогноз оплат появится, когда выбраны сегмент и текст публикации.
        </Text>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error} testID="alloc-error">
          {error}
        </Text>
      ) : null}
      <Button
        label="Подтвердить план"
        testID="alloc-confirm"
        onPress={() => {
          void onConfirm(units).then((message) => setError(message));
        }}
      />
    </View>
  );
}

function Stepper({
  label,
  text,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  text: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[styles.stepButton, disabled && styles.stepDisabled]}
    >
      <Text style={styles.stepText}>{text}</Text>
    </Pressable>
  );
}

function forecastFor(
  campaign: Campaign,
  facts: GameFacts,
  allocation: Record<string, number>,
): SimulationResult | null {
  if (!facts.segment || !facts.creative) return null;
  try {
    return simulateCoffeeV1(
      campaign.simulation,
      {
        segment: facts.segment,
        creative: facts.creative,
        baseline: facts.baselineEnabled,
        tracking: facts.trackingEnabled,
        allocation,
      },
      { limit: facts.budgetLimit, prepCost: facts.prepCost, target: facts.targetPaidVisits },
    );
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  prompt: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: theme.ink },
  channel: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 12,
    gap: 8,
  },
  channelTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  channelMeta: { fontSize: 14, lineHeight: 20, color: theme.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
  stepDisabled: { opacity: 0.35 },
  stepText: { fontSize: 22, color: theme.ink },
  count: { minWidth: 24, textAlign: 'center', fontSize: 18, fontWeight: '700', color: theme.ink },
  summary: { fontSize: 16, lineHeight: 22, color: theme.ink },
  forecast: {
    backgroundColor: theme.accentSoft,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  forecastTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  forecastRow: { fontSize: 14, lineHeight: 20, color: theme.ink },
  error: { color: theme.badInk, fontSize: 15, lineHeight: 22 },
});
