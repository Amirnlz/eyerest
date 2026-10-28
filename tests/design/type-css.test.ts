import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../src/design/build';
import { buildColorCss } from '../../src/design/css';
import {
  buildTypeCss,
  fontFamilyVar,
  typeProperties,
  typeVar,
} from '../../src/design/type-css';
import {
  fontFamilies,
  typeRoleNames,
  typeRoles,
} from '../../src/design/typography';

const css = buildTypeCss();

describe('buildTypeCss', () => {
  it('declares every font family once', () => {
    for (const name of Object.keys(
      fontFamilies,
    ) as (keyof typeof fontFamilies)[]) {
      expect(css.split(`${fontFamilyVar(name)}:`)).toHaveLength(2);
    }
  });

  it.each(typeRoleNames)(
    'declares every property of %s exactly once',
    (role) => {
      for (const property of typeProperties) {
        expect(css.split(`${typeVar(role, property)}:`)).toHaveLength(2);
      }
    },
  );

  it('emits rem sizes and unitless line heights', () => {
    for (const role of typeRoleNames) {
      expect(css).toContain(
        `${typeVar(role, 'size')}: ${typeRoles[role].size}rem;`,
      );
      expect(css).toContain(
        `${typeVar(role, 'line-height')}: ${typeRoles[role].lineHeight};`,
      );
    }
  });

  it('uses px nowhere', () => {
    expect(css).not.toMatch(/\d\s*px/);
  });

  it('maps tabularNums to font-variant-numeric values', () => {
    expect(css).toContain(`${typeVar('display', 'numeric')}: tabular-nums;`);
    expect(css).toContain(`${typeVar('body', 'numeric')}: normal;`);
  });

  it('is theme independent: one :root block', () => {
    expect(css.match(/:root \{/g)).toHaveLength(1);
    expect(css).not.toContain('data-theme');
  });
});

describe('buildDesignCss', () => {
  it('contains the color and type blocks and is deterministic', () => {
    const all = buildDesignCss();
    expect(all).toContain(buildColorCss());
    expect(all).toContain(css);
    expect(buildDesignCss()).toBe(all);
  });
});
