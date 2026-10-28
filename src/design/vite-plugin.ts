import { buildDesignCss } from './build';

/** Import this id from renderer code: `import 'virtual:eyerest-design.css'`. */
export const DESIGN_CSS_MODULE_ID = 'virtual:eyerest-design.css';

const RESOLVED_ID = `\0${DESIGN_CSS_MODULE_ID}`;

/**
 * Structural subset of a Vite plugin, so this file needs no `vite` import and stays testable in
 * node. Any object of this shape is a valid Vite plugin.
 *
 * Token changes need a dev-server restart: the plugin reads the tokens when the config loads.
 */
export type DesignCssPlugin = {
  readonly name: string;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
};

export function designCssPlugin(): DesignCssPlugin {
  return {
    name: 'eyerest-design-css',
    resolveId(id) {
      return id === DESIGN_CSS_MODULE_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      return id === RESOLVED_ID ? buildDesignCss() : undefined;
    },
  };
}
