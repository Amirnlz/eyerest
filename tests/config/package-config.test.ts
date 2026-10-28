import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relative: string): string =>
  readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');

interface BuilderConfig {
  appId?: string;
  productName?: string;
  directories?: { output?: string };
  files?: string[];
  asar?: boolean;
  linux?: { target?: string[]; maintainer?: string; category?: string };
  win?: { target?: string };
  mac?: { target?: string; identity?: unknown; extendInfo?: Record<string, unknown> };
}

interface PackageJson {
  main?: string;
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  homepage?: string;
}

const builder = JSON.parse(read('electron-builder.json')) as BuilderConfig;
const pkg = JSON.parse(read('package.json')) as PackageJson;

describe('electron-builder config', () => {
  it('has a reverse-DNS app id and a product name', () => {
    expect(builder.appId).toMatch(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
    expect(builder.productName).toBe('eyerest');
  });

  it('ships the build output and package.json, so the entry point resolves', () => {
    expect(pkg.main).toBe('./out/main/index.js');
    expect(builder.files).toContain('out/**');
    expect(builder.files).toContain('package.json');
  });

  it('does not ship sources, tests or the previous release output', () => {
    expect(builder.files).not.toContain('src/**');
    expect(builder.files).not.toContain('tests/**');
    expect(builder.files).not.toContain('release/**');
  });

  it('writes installers to release/, which is git-ignored and not linted', () => {
    expect(builder.directories?.output).toBe('release');
    expect(read('.gitignore')).toMatch(/^release\/$/m);
    expect(read('eslint.config.js')).toContain("'release/**'");
  });

  it('builds AppImage and deb on Linux', () => {
    expect(builder.linux?.target).toEqual(['AppImage', 'deb']);
  });

  it('a deb has a maintainer, which fpm requires', () => {
    expect(builder.linux?.maintainer).toMatch(/<.+@.+>/);
  });

  it('builds an NSIS installer on Windows', () => {
    expect(builder.win?.target).toBe('nsis');
  });

  it('builds an unsigned dmg on macOS, as a menu-bar-only app', () => {
    expect(builder.mac?.target).toBe('dmg');
    // Signing is a Phase 4 item; null skips it instead of failing without a certificate.
    expect(builder.mac?.identity).toBeNull();
    expect(builder.mac?.extendInfo?.['LSUIElement']).toBe(true);
  });

  it('keeps asar packaging on', () => {
    expect(builder.asar).toBe(true);
  });
});

describe('package.json scripts', () => {
  it('has build, package and e2e', () => {
    expect(pkg.scripts?.['build']).toBe('electron-vite build');
    expect(pkg.scripts?.['package']).toBe('npm run build && electron-builder');
    expect(pkg.scripts?.['e2e']).toBe('npm run build && playwright test');
  });

  it('declares electron-builder as a dev dependency', () => {
    expect(pkg.devDependencies?.['electron-builder']).toMatch(/^\^?\d+/);
  });

  it('has a homepage', () => {
    expect(pkg.homepage).toMatch(/^https:\/\//);
  });
});

describe('CI workflow', () => {
  const workflow = read('.github/workflows/ci.yml');

  it('runs on push to master and on pull requests', () => {
    expect(workflow).toMatch(/^on:\n {2}push:\n {4}branches: \[master\]\n {2}pull_request:/m);
  });

  it('covers Linux, Windows and macOS without stopping the others on a failure', () => {
    expect(workflow).toContain('os: [ubuntu-latest, windows-latest, macos-latest]');
    expect(workflow).toContain('fail-fast: false');
  });

  it('runs every stage in order: typecheck, lint, tests, build, e2e, package', () => {
    const stages = [
      'npm run typecheck',
      'npm run lint',
      'npm test',
      'npm run build',
      'npx playwright test',
      'npx electron-builder',
    ];
    const positions = stages.map((stage) => workflow.indexOf(stage));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('runs the Linux e2e under xvfb', () => {
    expect(workflow).toContain('xvfb-run -a npx playwright test');
  });

  it('uploads installers and fails if there are none', () => {
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('if-no-files-found: error');
    for (const extension of ['AppImage', 'deb', 'exe', 'dmg']) {
      expect(workflow).toContain(`release/*.${extension}`);
    }
  });

  it('uses the Node version the project requires', () => {
    expect(workflow).toContain('node-version: 22');
  });
});
