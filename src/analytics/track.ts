import { Platform } from 'react-native';
import type { GoalId } from './goals';

type YmFn = ((...args: unknown[]) => void) & { a?: unknown[]; l?: number };

interface BrowserWindow {
  ym?: YmFn;
}

/** Номер счётчика берётся только из окружения. Пустое значение — цель никуда не уходит. */
export function readCounterId(): number | null {
  const raw = process.env.EXPO_PUBLIC_YM_COUNTER_ID;
  if (!raw) return null;
  const counterId = Number(raw);
  if (!Number.isInteger(counterId) || counterId <= 0) return null;
  return counterId;
}

export function track(goal: GoalId, params?: Record<string, string | number | boolean>): void {
  if (Platform.OS !== 'web') return;
  const counterId = readCounterId();
  if (counterId === null || typeof document === 'undefined') return;
  const browser = window as unknown as BrowserWindow;
  ensureCounter(browser, counterId);
  browser.ym?.(counterId, 'reachGoal', goal, params);
}

function ensureCounter(browser: BrowserWindow, counterId: number): void {
  if (browser.ym) return;
  // Очередь Метрики читает именно arguments, не массив из rest.
  const queue: YmFn = function metricaQueue() {
    queue.a = queue.a || [];
    queue.a.push(arguments);
  };
  queue.l = Date.now();
  browser.ym = queue;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(script);
  browser.ym(counterId, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
  });
}
