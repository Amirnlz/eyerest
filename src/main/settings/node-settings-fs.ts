import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import type { SettingsFs } from './settings';

/** Node bindings for `SettingsFs`. Covered by a temp-directory test. */
export function createNodeSettingsFs(): SettingsFs {
  return {
    readFile(path) {
      try {
        return readFileSync(path, 'utf8');
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
        throw error;
      }
    },
    writeFile: (path, text) => writeFileSync(path, text, 'utf8'),
    rename: (from, to) => renameSync(from, to),
    remove: (path) => rmSync(path, { force: true }),
    ensureDir: (path) => {
      mkdirSync(path, { recursive: true });
    },
  };
}
