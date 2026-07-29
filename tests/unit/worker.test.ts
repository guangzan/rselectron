import { afterAll, expect, test } from '@rstest/core';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from '../../packages/rselectron/src/index.ts';

const roots: string[] = [];
const repositoryRoot = resolve(import.meta.dirname, '../..');

function createRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-worker-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

function mainConfig(appRoot: string) {
  return {
    main: {
      root: join(appRoot, 'main'),
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: true,
        distPath: { root: join(appRoot, 'out/main') },
        filename: { js: '[name].cjs' },
        filenameHash: false,
        minify: false,
        module: false,
        target: 'node' as const,
      },
      tools: { rspack: { externals: ['electron'] } },
      electron: { format: 'cjs' as const },
    },
  };
}

test('?modulePath emits an independent child bundle and returns its runtime path', async () => {
  const appRoot = createRoot('module-path');
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'worker-app', private: true }, null, 2)}\n`,
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/child.ts'),
    'export const marker = "child-bundle-ready";\n',
  );
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import childPath from './child.ts?modulePath';",
      "import { readFileSync } from 'node:fs';",
      'process.stdout.write(readFileSync(childPath, "utf8"));',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: mainConfig(appRoot),
  });

  try {
    const run = spawnSync(
      process.execPath,
      [join(appRoot, 'out/main/index.cjs')],
      { encoding: 'utf8' },
    );
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('child-bundle-ready');
  } finally {
    await result.close();
  }
});

test('?nodeWorker produces a Worker factory that runs Worker thread code', async () => {
  const appRoot = createRoot('node-worker');
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'worker-app', private: true }, null, 2)}\n`,
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/worker.ts'),
    [
      "import { parentPort } from 'node:worker_threads';",
      'parentPort!.postMessage("worker-ready");',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import createWorker from './worker.ts?nodeWorker';",
      'const worker = createWorker();',
      'worker.on("message", (message) => {',
      '  process.stdout.write(String(message));',
      '  void worker.terminate().then(() => process.exit(0));',
      '});',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: mainConfig(appRoot),
  });

  try {
    const run = spawnSync(
      process.execPath,
      [join(appRoot, 'out/main/index.cjs')],
      { encoding: 'utf8', timeout: 10_000 },
    );
    expect(run.status).toBe(0);
    expect(run.stdout).toBe('worker-ready');
  } finally {
    await result.close();
  }
});

test('@rselectron/core/node declares Worker query module types', () => {
  const appRoot = createRoot('types');
  mkdirSync(join(appRoot, 'node_modules/@rselectron/core'), {
    recursive: true,
  });
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'worker-types', private: true, type: 'module' }, null, 2)}\n`,
  );
  writeFileSync(
    join(appRoot, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          strict: true,
          typeRoots: [join(repositoryRoot, 'node_modules/@types')],
          types: ['node'],
        },
        include: ['main.ts'],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(appRoot, 'node_modules/@rselectron/core/package.json'),
    readFileSync(
      join(repositoryRoot, 'packages/rselectron/package.json'),
      'utf8',
    ),
  );
  writeFileSync(
    join(appRoot, 'node_modules/@rselectron/core/node.d.ts'),
    readFileSync(join(repositoryRoot, 'packages/rselectron/node.d.ts'), 'utf8'),
  );
  writeFileSync(
    join(appRoot, 'main.ts'),
    [
      "import '@rselectron/core/node';",
      "import createWorker from './worker.ts?nodeWorker';",
      "import workerPath from './worker.ts?modulePath';",
      'const path: string = workerPath;',
      'const worker = createWorker({});',
      'void path;',
      'void worker;',
      '',
    ].join('\n'),
  );
  writeFileSync(join(appRoot, 'worker.ts'), 'export {};\n');

  const tsc = join(repositoryRoot, 'node_modules/typescript/bin/tsc');
  const check = spawnSync(process.execPath, [tsc, '-p', appRoot], {
    encoding: 'utf8',
  });
  expect(check.status, check.stdout + check.stderr).toBe(0);
});
