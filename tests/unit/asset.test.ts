import { afterAll, expect, test } from '@rstest/core';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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
  const root = mkdtempSync(join(tmpdir(), `rselectron-asset-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

function writeMainApp(
  appRoot: string,
  mainSource: string,
  resources: Record<string, string>,
): void {
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'asset-app', private: true }, null, 2)}\n`,
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  mkdirSync(join(appRoot, 'resources'), { recursive: true });
  writeFileSync(join(appRoot, 'main/index.ts'), mainSource);
  for (const [name, body] of Object.entries(resources)) {
    writeFileSync(join(appRoot, 'resources', name), body);
  }
}

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

test('?asset resolves a runtime path from Main in production', async () => {
  const appRoot = createRoot('asset');
  writeMainApp(
    appRoot,
    [
      "import assetPath from '../resources/hello.txt?asset';",
      "import { readFileSync } from 'node:fs';",
      'process.stdout.write(readFileSync(assetPath, "utf8"));',
      '',
    ].join('\n'),
    {
      'hello.txt': 'hello-asset',
      'unused.bin': 'should-not-copy',
    },
  );

  const result = await build({
    cwd: appRoot,
    config: mainConfig(appRoot),
  });

  try {
    const mainEntry = join(appRoot, 'out/main/index.cjs');
    expect(existsSync(mainEntry)).toBe(true);
    const run = spawnSync(process.execPath, [mainEntry], { encoding: 'utf8' });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toBe('hello-asset');

    const outFiles = readdirSync(join(appRoot, 'out/main'), {
      recursive: true,
    }).map(String);
    expect(outFiles.some((name) => name.includes('unused'))).toBe(false);
  } finally {
    await result.close();
  }
});

test('?asset&asarUnpack rewrites packaged app.asar paths', async () => {
  const appRoot = createRoot('asar');
  writeMainApp(
    appRoot,
    [
      "import binPath from '../resources/tool.bin?asset&asarUnpack';",
      'process.stdout.write(binPath);',
      '',
    ].join('\n'),
    { 'tool.bin': 'binary-bytes' },
  );

  const result = await build({
    cwd: appRoot,
    config: mainConfig(appRoot),
  });

  try {
    const mainEntry = join(appRoot, 'out/main/index.cjs');
    const source = readFileSync(mainEntry, 'utf8');
    expect(source).toContain('app.asar');
    expect(source).toContain('app.asar.unpacked');

    const fakeAsarRoot = join(appRoot, 'fake-asar', 'app.asar', 'out', 'main');
    mkdirSync(fakeAsarRoot, { recursive: true });
    writeFileSync(join(fakeAsarRoot, 'index.cjs'), readFileSync(mainEntry));
    // Point __dirname at a fake asar layout by running from that directory copy.
    // The exported path should rewrite app.asar → app.asar.unpacked.
    const run = spawnSync(process.execPath, [join(fakeAsarRoot, 'index.cjs')], {
      encoding: 'utf8',
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('app.asar.unpacked');
    expect(run.stdout).not.toMatch(/app\.asar(?!\.unpacked)/);
  } finally {
    await result.close();
  }
});

test('Node-role entries stay stable while emitted non-resource assets use content hashes', async () => {
  const appRoot = createRoot('hash');
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'asset-hash-app', private: true }, null, 2)}\n`,
  );
  writeFileSync(join(appRoot, 'main/payload.bin'), 'payload-v1');
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import payload from './payload.bin?asset';",
      'process.stdout.write(payload);',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: mainConfig(appRoot),
  });

  try {
    expect(existsSync(join(appRoot, 'out/main/index.cjs'))).toBe(true);
    const assetsDir = join(appRoot, 'out/main/assets');
    expect(existsSync(assetsDir)).toBe(true);
    const assets = readdirSync(assetsDir);
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatch(/^payload\.[a-f0-9]+\.bin$/);
  } finally {
    await result.close();
  }
});

test('rselectron/node declares asset query module types', () => {
  const appRoot = createRoot('types');
  mkdirSync(join(appRoot, 'node_modules/rselectron'), { recursive: true });
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'asset-types', private: true, type: 'module' }, null, 2)}\n`,
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
    join(appRoot, 'node_modules/rselectron/package.json'),
    readFileSync(
      join(repositoryRoot, 'packages/rselectron/package.json'),
      'utf8',
    ),
  );
  writeFileSync(
    join(appRoot, 'node_modules/rselectron/node.d.ts'),
    readFileSync(join(repositoryRoot, 'packages/rselectron/node.d.ts'), 'utf8'),
  );
  writeFileSync(
    join(appRoot, 'main.ts'),
    [
      "import 'rselectron/node';",
      "import assetPath from './file.txt?asset';",
      "import unpacked from './file.txt?asset&asarUnpack';",
      'const paths: [string, string] = [assetPath, unpacked];',
      'void paths;',
      '',
    ].join('\n'),
  );
  writeFileSync(join(appRoot, 'file.txt'), 'x');

  const tsc = join(repositoryRoot, 'node_modules/typescript/bin/tsc');
  const check = spawnSync(process.execPath, [tsc, '-p', appRoot], {
    encoding: 'utf8',
  });
  expect(check.status, check.stdout + check.stderr).toBe(0);
});
