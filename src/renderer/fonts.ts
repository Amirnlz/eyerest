import type { DesignFont } from '../design/fonts';

/**
 * Registers bundled font files with the document. DOM objects are injected, so the logic runs
 * in Node tests. A missing or broken file never throws: the UI falls back to the system stack
 * that follows the family in `fontFamilies.sans`.
 */

export interface FontFaceLike {
  load(): Promise<unknown>;
}

export interface FontSetLike {
  add(face: FontFaceLike): unknown;
}

export type FontFaceFactory = (
  family: string,
  source: string,
  descriptors: FontFaceDescriptors,
) => FontFaceLike;

export interface LoadFontsDeps {
  /** Output of `import.meta.glob(..., { query: '?url' })`: source path to served URL. */
  readonly urls: Readonly<Record<string, string>>;
  readonly fonts: readonly DesignFont[];
  readonly createFace: FontFaceFactory;
  readonly fontSet: FontSetLike;
  readonly onError?: (family: string, error: unknown) => void;
}

export function findFontUrl(
  urls: Readonly<Record<string, string>>,
  file: string,
): string | undefined {
  const match = Object.entries(urls).find(
    ([path]) => path.split('/').pop() === file,
  );
  return match?.[1];
}

/** Resolves to the number of faces registered. */
export async function loadDesignFonts(deps: LoadFontsDeps): Promise<number> {
  const results = await Promise.all(
    deps.fonts.map(async (font) => {
      const url = findFontUrl(deps.urls, font.file);
      if (url === undefined) return false;
      try {
        const face = deps.createFace(font.family, `url("${url}")`, {
          weight: font.weight,
          style: 'normal',
          display: 'swap',
        });
        await face.load();
        deps.fontSet.add(face);
        return true;
      } catch (error) {
        deps.onError?.(font.family, error);
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}
