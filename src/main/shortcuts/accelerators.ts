/** The two actions a global shortcut can trigger. Both are valid only during a rest. */
export type ShortcutAction = 'skip' | 'postpone';

export type Accelerators = Readonly<Record<ShortcutAction, string>>;

/**
 * Electron accelerators, registered only while a rest is showing. Three modifiers on purpose: the
 * keys are taken from every other app for those 20 seconds, so a combination that real shortcuts
 * rarely use keeps the cost low. `CommandOrControl` is Command on macOS and Control elsewhere.
 */
export const DEFAULT_ACCELERATORS: Accelerators = Object.freeze({
  skip: 'CommandOrControl+Alt+Shift+S',
  postpone: 'CommandOrControl+Alt+Shift+P',
});

const MODIFIER_ORDER_MAC = ['Control', 'Alt', 'Shift', 'Command'] as const;
const MODIFIER_ORDER_OTHER = ['Control', 'Alt', 'Shift'] as const;

const MAC_SYMBOLS: Readonly<Record<string, string>> = {
  Control: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Command: '⌘',
};

function canonical(token: string, mac: boolean): string {
  switch (token.toLowerCase()) {
    case 'commandorcontrol':
    case 'cmdorctrl':
      return mac ? 'Command' : 'Control';
    case 'command':
    case 'cmd':
    case 'super':
    case 'meta':
      return 'Command';
    case 'control':
    case 'ctrl':
      return 'Control';
    case 'alt':
    case 'option':
      return 'Alt';
    case 'shift':
      return 'Shift';
    default:
      return token.length === 1 ? token.toUpperCase() : token;
  }
}

/**
 * The accelerator as people read it: `⌥⇧⌘S` on macOS (symbols in the platform's order) and
 * `Ctrl+Alt+Shift+S` on Windows and Linux. Pure. The last token is the key; the others are modifiers.
 */
export function formatAccelerator(accelerator: string, platform: NodeJS.Platform): string {
  const mac = platform === 'darwin';
  const tokens = accelerator.split('+').map((token) => canonical(token.trim(), mac));
  const key = tokens.at(-1) ?? '';
  const modifiers = new Set(tokens.slice(0, -1));
  const order = mac ? MODIFIER_ORDER_MAC : MODIFIER_ORDER_OTHER;
  const ordered = order.filter((modifier) => modifiers.has(modifier));

  if (mac) return `${ordered.map((modifier) => MAC_SYMBOLS[modifier] ?? modifier).join('')}${key}`;
  return [...ordered.map((modifier) => (modifier === 'Control' ? 'Ctrl' : modifier)), key].join('+');
}
