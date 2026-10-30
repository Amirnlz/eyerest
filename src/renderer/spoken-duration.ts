import { copy } from './copy';

function unit(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * Whole seconds as a spoken phrase: "20 seconds", "1 minute", "1 minute 30 seconds".
 * Invalid or negative input is "0 seconds".
 */
export function spokenDuration(totalSeconds: number): string {
  const seconds = Number.isFinite(totalSeconds)
    ? Math.max(0, Math.floor(totalSeconds))
    : 0;
  if (seconds < 60) return unit(seconds, copy.units.second);

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0
    ? unit(minutes, copy.units.minute)
    : `${unit(minutes, copy.units.minute)} ${unit(rest, copy.units.second)}`;
}
