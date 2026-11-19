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

/** 1 клик, 2 клика, 5 кликов, 11 кликов. Дробное число оставляем во множественном числе. */
export function pluralRu(value: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(value));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatClicks(value: number): string {
  const word = Number.isInteger(value) ? pluralRu(value, 'клик', 'клика', 'кликов') : 'кликов';
  return `${formatCount(value)} ${word}`;
}

/** Положительный процент с плюсом, отрицательный — с тем же минусом, что и деньги. */
export function formatPercent(value: Rational): string {
  const quantized = quantizeHalfEven(value, 2);
  const negative = quantized.startsWith('-');
  const body = (negative ? quantized.slice(1) : quantized).replace('.', ',');
  if (negative) return `−${body}%`;
  if (body !== '0') return `+${body}%`;
  return `${body}%`;
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
