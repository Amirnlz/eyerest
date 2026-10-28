import { buildColorCss } from './css';
import { buildElevationCss } from './elevation-css';
import { buildLayoutCss } from './layout-css';
import { buildTypeCss } from './type-css';

/** Full generated stylesheet. Each token group appends its own block here. */
export function buildDesignCss(): string {
  return [
    buildColorCss(),
    buildTypeCss(),
    buildLayoutCss(),
    buildElevationCss(),
  ].join('\n');
}
