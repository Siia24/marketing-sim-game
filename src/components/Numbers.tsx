import { StyleSheet, Text, View } from 'react-native';
import type { GameFacts } from '../engine/facts';
import {
  formatClicks,
  formatCount,
  formatMoney,
  formatMoneyPrecise,
  formatPercent,
  formatSignedMoney,
} from '../engine/format';
import type { SimulationResult } from '../engine/simulate';
import { theme } from './theme';

export function PlayerNumbers({ result, facts }: { result: SimulationResult; facts: GameFacts }) {
  return (
    <View style={styles.block} testID="player-numbers">
      <Text style={styles.heading}>Что видно по кассе, условно</Text>
      <Text testID="report-observed">Чеки периода, 14–17: {formatCount(result.observed)}</Text>
      <Text>
        Планка брифа {formatCount(facts.targetPaidVisits)}:{' '}
        {result.targetPassed ? 'достигнута' : 'не достигнута'}
      </Text>
      <Text testID="report-spent">Полные расходы: {formatMoney(result.cost)}</Text>
      <Text>Резерв: {formatMoney(result.reserve)}</Text>
      {result.baselineShown !== null && result.deltaShown !== null ? (
        <Text testID="report-baseline">
          Было {formatCount(result.baselineShown)}, стало {formatCount(result.observed)}, изменение{' '}
          {result.deltaShown > 0 ? '+' : ''}
          {formatCount(result.deltaShown)}
        </Text>
      ) : (
        <Text testID="report-baseline">
          Исходная неделя не проверена. Оценка владельца «человек двадцать в день» — не проверено.
        </Text>
      )}
      {result.rows.map((row) => (
        <Text key={row.channel}>
          {row.label}: {formatCount(row.impressions)} показов, {formatClicks(row.clicks)}
          {result.coded !== null ? `, с кодом ${row.coded ?? 0}` : ''}
        </Text>
      ))}
      {result.coded !== null ? (
        <Text testID="report-coded">
          Чеков с кодом: {formatCount(result.coded)}. Источник не установлен:{' '}
          {formatCount(result.unattributed)}.
          {result.costPerTracked
            ? ` Стоимость отслеженной оплаты: ${formatMoneyPrecise(result.costPerTracked)}.`
            : ''}
        </Text>
      ) : (
        <Text testID="report-coded">
          Источник не установлен у {formatCount(result.unattributed)} чеков. Коды на кассе не
          настраивались.
        </Text>
      )}
    </View>
  );
}

export function ModelNumbers({
  result,
  assumptions,
}: {
  result: SimulationResult;
  assumptions: string[];
}) {
  return (
    <View style={styles.block} testID="model-numbers">
      <Text style={styles.heading}>Разбор модели, условно</Text>
      <Text>
        В реальной работе этих чисел нет. Здесь других изменений, кроме кампании, модель не
        закладывала, поэтому она может показать причинную прибавку.
      </Text>
      <Text>Добавочные оплаты модели: {formatCount(result.added)}</Text>
      {result.capped ? (
        <Text>
          Сумма по площадкам упёрлась в мощность: сверху кофейня принимает не больше 100 чеков.
          Оплаты уменьшены пропорционально.
        </Text>
      ) : null}
      <Text>Добавочный вклад: {formatSignedMoney(result.incrementalContribution)}</Text>
      <Text testID="report-net">
        Вклад после кампании: {formatSignedMoney(result.netContribution)}
      </Text>
      <Text testID="report-romi">ROMI модели: {formatPercent(result.romi)}</Text>
      <Text>
        Полная стоимость добавочной оплаты:{' '}
        {result.modelCostPerIncremental
          ? formatMoneyPrecise(result.modelCostPerIncremental)
          : 'нет данных, оплат сверху не было'}
      </Text>
      {assumptions.map((item) => (
        <Text key={item} style={styles.note}>
          {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  heading: { fontSize: 18, fontWeight: '700', color: theme.ink, marginBottom: 4 },
  note: { color: theme.muted, fontSize: 14, lineHeight: 20 },
});
