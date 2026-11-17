/**
 * Дробь с целыми числителем и знаменателем.
 * Так округление совпадает с decimal.Decimal в sim_check.py и не зависит от двоичного float.
 */
export interface Rational {
  n: bigint;
  d: bigint;
}

export function rational(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) {
    throw new Error('Нулевой знаменатель в расчёте.');
  }
  let n = numerator;
  let d = denominator;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}

export function fromInt(value: number): Rational {
  return rational(BigInt(value), 1n);
}

/** JSON-числа вроде 0.875 и 0.6 читаем через их десятичную запись, а не через float. */
export function fromNumber(value: number): Rational {
  if (!Number.isFinite(value)) {
    throw new Error(`Некорректное число модели: ${String(value)}`);
  }
  return fromDecimalString(String(value));
}

export function fromDecimalString(input: string): Rational {
  const text = input.trim();
  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;
  if (!/^\d+(\.\d+)?$/.test(body)) {
    throw new Error(`Не удалось прочитать число «${input}».`);
  }
  const [whole, fraction = ''] = body.split('.');
  const numerator = BigInt(`${whole}${fraction}`) * (negative ? -1n : 1n);
  const denominator = 10n ** BigInt(fraction.length);
  return rational(numerator, denominator);
}

export function mul(left: Rational, right: Rational): Rational {
  return rational(left.n * right.n, left.d * right.d);
}

export function div(left: Rational, right: Rational): Rational {
  if (right.n === 0n) {
    throw new Error('Деление на ноль в расчёте.');
  }
  return rational(left.n * right.d, left.d * right.n);
}

export function sub(left: Rational, right: Rational): Rational {
  return rational(left.n * right.d - right.n * left.d, left.d * right.d);
}

export function compare(left: Rational, right: Rational): number {
  const delta = left.n * right.d - right.n * left.d;
  if (delta < 0n) return -1;
  if (delta > 0n) return 1;
  return 0;
}

/** ROUND_FLOOR, как Decimal.to_integral_value(rounding=ROUND_FLOOR). */
export function floorRational(value: Rational): number {
  const quotient = value.n / value.d;
  if (value.n % value.d !== 0n && value.n < 0n) {
    return Number(quotient - 1n);
  }
  return Number(quotient);
}

export function toNumber(value: Rational): number {
  return Number(value.n) / Number(value.d);
}

/**
 * Квантование к нужному числу знаков, ROUND_HALF_EVEN.
 * Целый результат без дробной части — как функция f() в sim_check.py.
 */
export function quantizeHalfEven(value: Rational, places: number): string {
  const factor = 10n ** BigInt(places);
  const negative = value.n < 0n;
  const numerator = negative ? -value.n : value.n;
  const scaled = numerator * factor;
  const quotient = scaled / value.d;
  const remainder = scaled % value.d;
  const twice = remainder * 2n;
  let rounded = quotient;
  if (twice > value.d || (twice === value.d && quotient % 2n === 1n)) {
    rounded += 1n;
  }
  const sign = negative && rounded !== 0n ? '-' : '';
  if (places === 0) return `${sign}${rounded.toString()}`;
  const whole = rounded / factor;
  const fraction = (rounded % factor).toString().padStart(places, '0');
  if (/^0+$/.test(fraction)) return `${sign}${whole.toString()}`;
  return `${sign}${whole.toString()}.${fraction}`;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}
