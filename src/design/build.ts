import { buildColorCss } from './css';
import { buildTypeCss } from './type-css';

/** Full generated stylesheet. Each token group appends its own block here. */
export function buildDesignCss(): string {
  return `${buildColorCss()}\n${buildTypeCss()}`;
}
