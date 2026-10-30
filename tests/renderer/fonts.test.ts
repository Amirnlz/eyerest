import { describe, expect, it, vi } from 'vitest';
import type { DesignFont } from '../../src/design/fonts';
import {
  findFontUrl,
  loadDesignFonts,
  type FontFaceLike,
} from '../../src/renderer/fonts';

const font: DesignFont = {
  family: 'Test Sans',
  weight: '200 800',
  file: 'Test-Variable.woff2',
};

function makeDeps(
  overrides: Partial<Parameters<typeof loadDesignFonts>[0]> = {},
) {
  const added: FontFaceLike[] = [];
  const created: { family: string; source: string; descriptors: unknown }[] =
    [];
  const deps = {
    urls: { './assets/fonts/Test-Variable.woff2': '/assets/Test-abc123.woff2' },
    fonts: [font],
    createFace: (family: string, source: string, descriptors: unknown) => {
      created.push({ family, source, descriptors });
      return { load: () => Promise.resolve() } as FontFaceLike;
    },
    fontSet: { add: (face: FontFaceLike) => void added.push(face) },
    ...overrides,
  };
  return { deps, added, created };
}

describe('findFontUrl', () => {
  it('matches by file name regardless of directory or hash in the URL', () => {
    const urls = {
      './assets/fonts/A.woff2': '/x/A-1.woff2',
      './assets/fonts/B.woff2': '/x/B-2.woff2',
    };
    expect(findFontUrl(urls, 'B.woff2')).toBe('/x/B-2.woff2');
  });

  it('returns undefined when no file matches', () => {
    expect(findFontUrl({}, 'A.woff2')).toBeUndefined();
    expect(
      findFontUrl({ './assets/fonts/AB.woff2': '/x' }, 'B.woff2'),
    ).toBeUndefined();
  });
});

describe('loadDesignFonts', () => {
  it('registers a face with weight range, normal style and swap display', async () => {
    const { deps, added, created } = makeDeps();
    await expect(loadDesignFonts(deps)).resolves.toBe(1);
    expect(added).toHaveLength(1);
    expect(created[0]).toEqual({
      family: 'Test Sans',
      source: 'url("/assets/Test-abc123.woff2")',
      descriptors: { weight: '200 800', style: 'normal', display: 'swap' },
    });
  });

  it('adds the face only after it has loaded', async () => {
    const order: string[] = [];
    const { deps } = makeDeps({
      createFace: () => ({
        load: () => Promise.resolve().then(() => void order.push('loaded')),
      }),
      fontSet: { add: () => void order.push('added') },
    });
    await loadDesignFonts(deps);
    expect(order).toEqual(['loaded', 'added']);
  });

  it('does nothing and does not throw when the font file is missing', async () => {
    const { deps, added, created } = makeDeps({ urls: {} });
    await expect(loadDesignFonts(deps)).resolves.toBe(0);
    expect(created).toHaveLength(0);
    expect(added).toHaveLength(0);
  });

  it('reports a failed load, skips that face, and never rejects', async () => {
    const onError = vi.fn();
    const { deps, added } = makeDeps({
      createFace: () => ({ load: () => Promise.reject(new Error('bad font')) }),
      onError,
    });
    await expect(loadDesignFonts(deps)).resolves.toBe(0);
    expect(added).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith('Test Sans', expect.any(Error));
  });

  it('reports a factory that throws synchronously', async () => {
    const onError = vi.fn();
    const { deps } = makeDeps({
      createFace: () => {
        throw new Error('no FontFace');
      },
      onError,
    });
    await expect(loadDesignFonts(deps)).resolves.toBe(0);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('loads several fonts independently: one failure keeps the others', async () => {
    const second: DesignFont = {
      family: 'Other',
      weight: '400',
      file: 'Other.woff2',
    };
    const { deps, added } = makeDeps({
      fonts: [font, second],
      urls: {
        './assets/fonts/Test-Variable.woff2': '/a.woff2',
        './assets/fonts/Other.woff2': '/b.woff2',
      },
      createFace: (family: string) => ({
        load: () =>
          family === 'Test Sans'
            ? Promise.reject(new Error('x'))
            : Promise.resolve(),
      }),
    });
    await expect(loadDesignFonts(deps)).resolves.toBe(1);
    expect(added).toHaveLength(1);
  });
});
