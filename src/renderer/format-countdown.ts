/**
 * Formats whole seconds for display.
 * - under a minute: plain seconds ("20", "5", "0")
 * - a minute or more: "m:ss" ("1:00", "9:59", "10:00")
 * Invalid or negative input is shown as "0".
 */
export function formatCountdown(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0';

  const seconds = Math.floor(totalSeconds);
  if (seconds < 60) return String(seconds);

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
