import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { designFonts } from '../../src/design/fonts';

const DIR = join(__dirname, '../../src/renderer/assets/fonts');
const MAX_BYTES = 150 * 1024;

describe('bundled font files', () => {
  const present = designFonts.filter((f) => existsSync(join(DIR, f.file)));

  it('lists only woff2 files in the folder that the design fonts declare', () => {
    const declared = new Set(designFonts.map((f) => f.file));
    const stray = readdirSync(DIR).filter(
      (name) => name.endsWith('.woff2') && !declared.has(name),
    );
    expect(stray).toEqual([]);
  });

  it('every present font is a real woff2 file under the size budget', () => {
    for (const font of present) {
      const path = join(DIR, font.file);
      expect(readFileSync(path).subarray(0, 4).toString('latin1')).toBe('wOF2');
      expect(statSync(path).size).toBeLessThanOrEqual(MAX_BYTES);
    }
  });

  it('ships the OFL license whenever a font file is present', () => {
    if (present.length > 0) {
      expect(existsSync(join(DIR, 'OFL.txt'))).toBe(true);
    }
  });
});
