/**
 * The global shortcuts main has registered, as text for the overlay. `null` means that action has
 * no shortcut right now (not registered yet, refused by the OS, or the feature is off), so the
 * overlay never advertises a key that does nothing.
 */
export interface ShortcutHints {
  readonly skip: string | null;
  readonly postpone: string | null;
}

export const NO_SHORTCUT_HINTS: ShortcutHints = Object.freeze({ skip: null, postpone: null });

/** Longest label the overlay accepts. Real labels are under 20 characters. */
const MAX_LABEL_LENGTH = 32;

function isLabel(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.trim() !== '' && value.length <= MAX_LABEL_LENGTH);
}

/**
 * Validates a pushed payload. Returns null for anything that is not exactly `{ skip, postpone }`
 * with a short label or null in each, so a malformed push is dropped and never rendered.
 */
export function parseShortcutHints(value: unknown): ShortcutHints | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = new Map(Object.entries(value));
  if (record.size !== 2) return null;
  const skip = record.get('skip');
  const postpone = record.get('postpone');
  if (!isLabel(skip) || !isLabel(postpone) || skip === undefined || postpone === undefined) return null;
  return { skip, postpone };
}
