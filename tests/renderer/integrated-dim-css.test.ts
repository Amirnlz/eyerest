import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cssVarName } from '../../src/design/css';
import { stripComments } from '../helpers/css-scan';

describe('integrated dim stylesheet', () => {
  const css = stripComments(
    readFileSync(join(__dirname, '../../src/renderer/components/IntegratedDim.css'), 'utf8'),
  );

  it('paints with the scrim token only', () => {
    expect(css).toContain(`background-color: var(${cssVarName('scrim')});`);
  });

  it('covers the whole window', () => {
    expect(css).toMatch(/position:\s*fixed;/);
    expect(css).toMatch(/inset:\s*0;/);
  });
});
