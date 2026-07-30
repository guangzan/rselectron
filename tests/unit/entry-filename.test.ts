import { afterAll, expect, test } from '@rstest/core';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  defaultEntryFilenamePattern,
  plannedMainEntry,
} from '../../packages/core/src/electron/entry.ts';
import { normalizeRuntime } from '../../packages/core/src/electron/runtime.ts';
import { writeFakeElectron } from '../helpers/fake-electron.ts';

const roots: string[] = [];

function createAppRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-entry-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

test('defaultEntryFilenamePattern covers the ADR 0009 matrix', () => {
  expect(defaultEntryFilenamePattern('esm', 'module')).toBe('[name].mjs');
  expect(defaultEntryFilenamePattern('esm', undefined)).toBe('[name].mjs');
  expect(defaultEntryFilenamePattern('cjs', 'module')).toBe('[name].cjs');
  expect(defaultEntryFilenamePattern('cjs', undefined)).toBe('[name].js');
});

test('plannedMainEntry tracks the normalized entry filename policy', () => {
  const appRoot = createAppRoot('planned');
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'app', private: true, type: 'module' }, null, 2)}\n`,
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(join(appRoot, 'main/index.ts'), "console.log('main');\n");
  writeFakeElectron({ appRoot, version: '42.7.1' });

  const runtime = normalizeRuntime({
    appRoot,
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          distPath: { root: join(appRoot, 'out/main') },
          target: 'node',
        },
        electron: { format: 'esm' },
      },
    },
  });

  expect(runtime.roles.main?.output?.filename).toEqual({ js: '[name].mjs' });
  expect(plannedMainEntry(appRoot, runtime.roles.main!)).toBe(
    join(appRoot, 'out/main/index.mjs'),
  );
});

test('plannedMainEntry uses .cjs when CJS runs under type:module', () => {
  const appRoot = createAppRoot('planned-cjs-module');
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'app', private: true, type: 'module' }, null, 2)}\n`,
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(join(appRoot, 'main/index.ts'), "console.log('main');\n");

  const runtime = normalizeRuntime({
    appRoot,
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          distPath: { root: join(appRoot, 'out/main') },
          module: false,
          overrideBrowserslist: ['node >= 20'],
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    },
  });

  expect(plannedMainEntry(appRoot, runtime.roles.main!)).toBe(
    join(appRoot, 'out/main/index.cjs'),
  );
});
