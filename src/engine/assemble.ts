import type { AssembleStep, Choice } from '../content/types';

const SITUATIONAL_HOOK = 'Ситуационный повод';

export interface AssemblyPart {
  slotId: string;
  label: string;
  text: string;
}

/**
 * В v1 игрок выбирает готовый шаблон, а не смешивает части.
 * Части лежат в подписи варианта и разделены « + ».
 * «Ситуационный повод» подменяется текстом сегмента из урока.
 */
export function assemblyParts(
  step: AssembleStep,
  choice: Choice,
  segmentHook: string | undefined,
): AssemblyPart[] {
  const pieces = choice.label.split(' + ').map((piece) => piece.trim());
  if (pieces.length !== step.slots.length) {
    return step.slots.map((slot) => ({
      slotId: slot.id,
      label: slot.label,
      text: choice.label,
    }));
  }
  return step.slots.map((slot, index) => {
    const piece = pieces[index] ?? '';
    const useHook = slot.binding === 'segmentHooks' && piece === SITUATIONAL_HOOK && segmentHook;
    return {
      slotId: slot.id,
      label: slot.label,
      text: useHook ? segmentHook : piece,
    };
  });
}
