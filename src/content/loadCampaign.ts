import type { Campaign } from './types';

const SUPPORTED_SCHEMA = 1;
const SUPPORTED_SIMULATION = 'coffee-v1';
const STEP_TYPES = new Set(['choice', 'assemble', 'allocate', 'debrief']);

export function loadCampaign(raw: unknown): Campaign {
  if (!isRecord(raw)) {
    throw new Error('Кампания должна быть JSON-объектом.');
  }
  if (raw.schemaVersion !== SUPPORTED_SCHEMA) {
    throw new Error(
      `Приложение не знает schemaVersion ${String(raw.schemaVersion)}. Поддерживается только ${SUPPORTED_SCHEMA}.`,
    );
  }
  if (raw.simulationVersion !== SUPPORTED_SIMULATION) {
    throw new Error(
      `Нет движка для simulationVersion «${String(raw.simulationVersion)}». Сейчас поддерживается ${SUPPORTED_SIMULATION}.`,
    );
  }
  if (typeof raw.id !== 'string' || typeof raw.contentVersion !== 'string') {
    throw new Error('У кампании должны быть id и contentVersion.');
  }
  if (!Array.isArray(raw.lessons) || raw.lessons.length === 0) {
    throw new Error('В кампании нет уроков.');
  }
  for (const lesson of raw.lessons) {
    assertLesson(lesson);
  }
  return raw as unknown as Campaign;
}

function assertLesson(lesson: unknown): void {
  if (!isRecord(lesson) || typeof lesson.id !== 'string' || !Array.isArray(lesson.steps)) {
    throw new Error('Урок без id или списка шагов.');
  }
  if (!isRecord(lesson.quiz) || !Array.isArray(lesson.quiz.questions)) {
    throw new Error(`У урока «${lesson.id}» нет квиза.`);
  }
  for (const step of lesson.steps) {
    if (!isRecord(step) || typeof step.id !== 'string' || !STEP_TYPES.has(String(step.type))) {
      throw new Error(`У урока «${lesson.id}» есть шаг неизвестного типа.`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
