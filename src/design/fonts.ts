/**
 * Fonts the design system ships. Data only: the loader lives in the renderer, the files in
 * `src/renderer/assets/fonts/`. The family name must appear in `fontFamilies.sans`
 * (`typography.ts`), and a test enforces that.
 */

export interface DesignFont {
  /** CSS family name registered for the face. */
  readonly family: string;
  /** CSS font-weight range the file covers (a variable font). */
  readonly weight: string;
  /** File name inside `src/renderer/assets/fonts/`. */
  readonly file: string;
}

export const designFonts: readonly DesignFont[] = [
  {
    family: 'Manrope Variable',
    weight: '200 800',
    file: 'Manrope-Variable.woff2',
  },
];
