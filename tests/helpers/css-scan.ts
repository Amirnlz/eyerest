/** Small CSS scanners for lint-style tests. Not a parser: enough for flat, hand-written CSS. */

export function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Custom properties used through `var(--name)`. */
export function usedVars(css: string): string[] {
  return [...stripComments(css).matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((m) => m[1] ?? '');
}

/** Custom properties declared as `--name:`. Skips selectors such as `.a--b:hover`. */
export function declaredVars(css: string): Set<string> {
  const matches = stripComments(css).matchAll(/(?<![\w-])(--[a-z0-9-]+)\s*:/gi);
  return new Set([...matches].map((m) => m[1] ?? ''));
}

/** Raw color literals: hex, rgb(), hsl(), hwb(), lab(), lch(), oklab(), oklch(), color(). */
export function rawColorLiterals(css: string): string[] {
  const body = stripComments(css);
  const hex = body.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  const fn = body.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi) ?? [];
  return [...hex, ...fn];
}

/** Raw pixel lengths such as `12px`. `0` is allowed. */
export function rawPixelLengths(css: string): string[] {
  return stripComments(css).match(/(?<![\w-])\d*\.?\d+px\b/g) ?? [];
}

/**
 * Selectors that use `:hover` while not nested in `@media (hover: hover)`.
 * Tracks brace depth and the at-rule header that opened each block.
 */
export function hoverOutsideHoverMedia(css: string): string[] {
  const body = stripComments(css);
  const offenders: string[] = [];
  const stack: string[] = [];
  let header = '';
  for (const ch of body) {
    if (ch === '{') {
      const text = header.trim();
      if (text.includes(':hover') && !stack.some((h) => /\(\s*hover\s*:\s*hover\s*\)/.test(h))) {
        offenders.push(text);
      }
      stack.push(text);
      header = '';
    } else if (ch === '}') {
      stack.pop();
      header = '';
    } else if (ch === ';') {
      header = '';
    } else {
      header += ch;
    }
  }
  return offenders;
}
