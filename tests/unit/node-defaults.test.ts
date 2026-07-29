import { afterAll, expect, test } from '@rstest/core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, inspect } from '../../packages/rselectron/src/index.ts';

const roots: string[] = [];

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

test('Main and Preload default to no minify and stable unhashed entry names', async () => {
  const appRoot = mkdtempSync(join(tmpdir(), 'rselectron-node-defaults-'));
  roots.push(appRoot);
  writeFileSync(
    join(appRoot, 'package.json'),
    '{"name":"defaults","private":true}\n',
  );
  writeFileSync(join(appRoot, 'main.ts'), "console.log('main');\n");
  writeFileSync(join(appRoot, 'preload.ts'), "console.log('preload');\n");

  const inspected = await inspect({
    cwd: appRoot,
    config: {
      main: {
        root: appRoot,
        source: { entry: { index: './main.ts' } },
        output: {
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].cjs' },
          module: false,
          target: 'node',
        },
        tools: { rspack: { externals: ['electron'] } },
        electron: { format: 'cjs' },
      },
      preload: {
        root: appRoot,
        source: { entry: { index: './preload.ts' } },
        output: {
          distPath: { root: join(appRoot, 'out/preload') },
          filename: { js: '[name].cjs' },
          module: false,
          target: 'node',
        },
        tools: { rspack: { externals: ['electron'] } },
        electron: { format: 'cjs' },
      },
    },
  });

  expect(inspected.roles.main?.normalized.output?.minify).toBe(false);
  expect(inspected.roles.main?.normalized.output?.filenameHash).toBe(false);
  expect(inspected.roles.preload?.normalized.output?.minify).toBe(false);
  expect(inspected.roles.preload?.normalized.output?.filenameHash).toBe(false);

  const result = await build({
    cwd: appRoot,
    config: {
      main: inspected.roles.main!.normalized,
      preload: inspected.roles.preload!.normalized,
    },
  });

  try {
    expect(
      result.roles.main?.paths.some((path) => path.endsWith('index.cjs')),
    ).toBe(true);
    expect(
      result.roles.preload?.paths.some((path) => path.endsWith('index.cjs')),
    ).toBe(true);
    expect(
      result.roles.main?.paths.some((path) =>
        /index\.[a-f0-9]+\.cjs$/i.test(path),
      ),
    ).toBe(false);
  } finally {
    await result.close();
  }
});
