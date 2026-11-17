import { quantizeHalfEven, type Rational } from './decimal';

const grouped = new Intl.NumberFormat('ru-RU');

export function formatMoney(value: number): string {
  return `${grouped.format(value)} ₽`;
}

export function formatSignedMoney(value: number): string {
  if (value > 0) return `+${formatMoney(value)}`;
  if (value < 0) return `−${formatMoney(Math.abs(value))}`;
  return formatMoney(0);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}

export function formatPercent(value: Rational): string {
  return `${quantizeHalfEven(value, 2).replace('.', ',')}%`;
}

export function formatMoneyPrecise(value: Rational): string {
  const quantized = quantizeHalfEven(value, 2);
  const negative = quantized.startsWith('-');
  const body = negative ? quantized.slice(1) : quantized;
  if (!body.includes('.')) {
    const money = formatMoney(Number(body));
    return negative ? `−${money}` : money;
  }
  const [whole, fraction] = body.split('.');
  const money = `${grouped.format(Number(whole))},${fraction} ₽`;
  return negative ? `−${money}` : money;
}
