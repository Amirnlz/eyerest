import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNodeSettingsFs } from '../../src/main/settings/node-settings-fs';
import { loadSettings, saveSettings } from '../../src/main/settings/settings';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'eyerest-settings-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('createNodeSettingsFs (real temp directory)', () => {
  it('a missing file loads as defaults', () => {
    expect(loadSettings(createNodeSettingsFs(), join(dir, 'settings.json')).status).toBe('missing');
  });

  it('saves into a directory that does not exist yet, and loads it back', () => {
    const path = join(dir, 'nested', 'settings.json');
    const fs = createNodeSettingsFs();

    saveSettings(fs, path, { workIntervalMs: 600_000 });

    expect(loadSettings(fs, path)).toMatchObject({ status: 'loaded', overrides: { workIntervalMs: 600_000 } });
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  it('replaces an existing file', () => {
    const path = join(dir, 'settings.json');
    writeFileSync(path, '{ "postponeMs": 60000 }');

    saveSettings(createNodeSettingsFs(), path, { postponeMs: 90_000 });

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ postponeMs: 90_000 });
  });

  it('a directory in place of the file is reported, not thrown', () => {
    const result = loadSettings(createNodeSettingsFs(), dir);
    expect(result.status).toBe('invalid');
  });
});
