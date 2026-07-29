import { afterAll, expect, test } from '@rstest/core';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  build,
  defineConfig,
  loadEnv,
  mergeRsbuildConfig,
  mergeRselectronConfig,
} from '../../packages/rselectron/src/index.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');

const roots: string[] = [];

function createRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-config-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

test('only documented rselectron.config.* names are discovered implicitly', async () => {
  const appRoot = createRoot('discovery');
  writeFileSync(
    join(appRoot, 'rsbuild.config.ts'),
    'export default { main: { source: { entry: { index: "./missing.ts" } } } };\n',
  );
  writeFileSync(
    join(appRoot, 'electron.vite.config.ts'),
    'export default { main: { source: { entry: { index: "./missing.ts" } } } };\n',
  );
  writeFileSync(join(appRoot, 'rselectron.config.mjs'), 'export default {};\n');

  const result = await build({
    cwd: appRoot,
    configLoader: 'native',
  });

  expect(result.warnings).toHaveLength(3);
  await result.close();
});

test('an explicit config path takes precedence over discovery', async () => {
  const appRoot = createRoot('explicit-path');
  writeFileSync(join(appRoot, 'rselectron.config.mjs'), 'export default {};\n');
  writeFileSync(
    join(appRoot, 'custom.config.mjs'),
    `export default {
      main: {
        source: { entry: { index: './main.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: './out/main' },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    };
`,
  );
  writeFileSync(join(appRoot, 'main.ts'), "console.log('from-custom');\n");

  const result = await build({
    cwd: appRoot,
    configPath: join(appRoot, 'custom.config.mjs'),
    configLoader: 'native',
  });

  expect(Object.keys(result.roles)).toEqual(['main']);
  await result.close();
});

test('native, jiti, and auto loaders load supported configuration forms', async () => {
  const appRoot = createRoot('loaders');
  writeFileSync(
    join(appRoot, 'rselectron.config.cjs'),
    `module.exports = {
      main: {
        source: { entry: { index: './main.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: './out/main' },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    };
`,
  );
  writeFileSync(join(appRoot, 'main.ts'), "console.log('cjs-config');\n");

  for (const configLoader of ['native', 'jiti', 'auto'] as const) {
    const result = await build({
      cwd: appRoot,
      configLoader,
      configPath: join(appRoot, 'rselectron.config.cjs'),
    });
    expect(Object.keys(result.roles)).toEqual(['main']);
    await result.close();
  }
});

test('defineConfig keeps command, mode, and envMode independent', async () => {
  let received:
    | {
        command: string;
        envMode: string;
        mode: string;
      }
    | undefined;

  const result = await build({
    config: defineConfig((context) => {
      received = context;
      return {};
    }),
    envMode: 'canary',
    mode: 'development',
  });

  expect(received).toEqual({
    command: 'build',
    envMode: 'canary',
    mode: 'development',
  });
  await result.close();
});

test('mergeRselectronConfig and mergeRsbuildConfig preserve distinct merge behavior', () => {
  const mergedRole = mergeRsbuildConfig(
    {
      plugins: [{ name: 'a', setup() {} }],
      tools: {
        rspack(config) {
          return { ...config, name: 'first' };
        },
      },
    },
    {
      plugins: [{ name: 'b', setup() {} }],
      tools: {
        rspack(config) {
          return { ...config, name: 'second' };
        },
      },
    },
  );

  expect(mergedRole.plugins?.map((plugin) => plugin.name)).toEqual(['a', 'b']);
  expect(Array.isArray(mergedRole.tools?.rspack)).toBe(true);

  const merged = mergeRselectronConfig(
    {
      electron: { execPath: './a' },
      main: {
        source: { entry: { index: './a.ts' } },
        electron: { format: 'cjs' },
      },
    },
    {
      electron: { packageJson: './package.json' },
      main: {
        output: { target: 'node' },
        electron: { format: 'esm' },
      },
      renderer: {
        source: { entry: { index: './r.ts' } },
      },
    },
  );

  expect(merged.electron).toEqual({
    execPath: './a',
    packageJson: './package.json',
  });
  expect(merged.main?.electron).toEqual({ format: 'esm' });
  expect(merged.main?.source?.entry).toEqual({ index: './a.ts' });
  expect(merged.main?.output?.target).toBe('node');
  expect(merged.renderer?.source?.entry).toEqual({ index: './r.ts' });
});

test('loadEnv uses the four Rselectron prefixes and returns cleanup metadata', () => {
  const appRoot = createRoot('env');
  writeFileSync(
    join(appRoot, '.env.staging'),
    [
      'RSELECTRON_SHARED=shared',
      'MAIN_RSELECTRON_ONLY=main',
      'PRELOAD_RSELECTRON_ONLY=preload',
      'RENDERER_RSELECTRON_ONLY=renderer',
      'OTHER_VALUE=ignored',
    ].join('\n'),
  );

  const processEnv: Record<string, string> = {};
  const result = loadEnv({
    cwd: appRoot,
    mode: 'staging',
    processEnv,
  });

  expect(result.parsed).toMatchObject({
    RSELECTRON_SHARED: 'shared',
    MAIN_RSELECTRON_ONLY: 'main',
    PRELOAD_RSELECTRON_ONLY: 'preload',
    RENDERER_RSELECTRON_ONLY: 'renderer',
    OTHER_VALUE: 'ignored',
  });
  expect(result.rawPublicVars).toEqual({
    RSELECTRON_SHARED: 'shared',
    MAIN_RSELECTRON_ONLY: 'main',
    PRELOAD_RSELECTRON_ONLY: 'preload',
    RENDERER_RSELECTRON_ONLY: 'renderer',
  });
  expect(result.filePaths.some((path) => path.endsWith('.env.staging'))).toBe(
    true,
  );
  expect(typeof result.cleanup).toBe('function');
  expect(processEnv.RSELECTRON_SHARED).toBe('shared');
  result.cleanup();
  expect(processEnv.RSELECTRON_SHARED).toBeUndefined();
});

test('Role builds receive only shared and Role-scoped environment variables', async () => {
  const appRoot = createRoot('role-env');
  writeFileSync(
    join(appRoot, '.env.production'),
    [
      'RSELECTRON_SHARED=shared',
      'MAIN_RSELECTRON_ONLY=main-only',
      'PRELOAD_RSELECTRON_ONLY=preload-only',
      'RENDERER_RSELECTRON_ONLY=renderer-only',
    ].join('\n'),
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  mkdirSync(join(appRoot, 'preload'), { recursive: true });
  const source = [
    'const values = {',
    '  shared: process.env.RSELECTRON_SHARED ?? null,',
    '  main: process.env.MAIN_RSELECTRON_ONLY ?? null,',
    '  preload: process.env.PRELOAD_RSELECTRON_ONLY ?? null,',
    '  renderer: process.env.RENDERER_RSELECTRON_ONLY ?? null,',
    '};',
    'console.log(JSON.stringify(values));',
    '',
  ].join('\n');
  writeFileSync(join(appRoot, 'main/index.ts'), source);
  writeFileSync(join(appRoot, 'preload/index.ts'), source);

  for (const key of Object.keys(process.env)) {
    if (key.includes('RSELECTRON')) {
      delete process.env[key];
    }
  }

  const result = await build({
    cwd: appRoot,
    envMode: 'production',
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
      preload: {
        root: join(appRoot, 'preload'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/preload') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    },
  });

  expect(process.env.PRELOAD_RSELECTRON_ONLY).toBeUndefined();
  expect(process.env.MAIN_RSELECTRON_ONLY).toBeUndefined();

  const mainEntry = join(appRoot, 'out/main/index.cjs');
  const preloadEntry = join(appRoot, 'out/preload/index.cjs');
  const childEnv = {
    PATH: process.env.PATH!,
    HOME: process.env.HOME!,
  };
  const mainRun = spawnSync(process.execPath, [mainEntry], {
    encoding: 'utf8',
    env: childEnv,
  });
  const preloadRun = spawnSync(process.execPath, [preloadEntry], {
    encoding: 'utf8',
    env: childEnv,
  });

  expect(mainRun.status).toBe(0);
  expect(JSON.parse(mainRun.stdout)).toEqual({
    shared: 'shared',
    main: 'main-only',
    preload: null,
    renderer: null,
  });
  expect(preloadRun.status).toBe(0);
  expect(JSON.parse(preloadRun.stdout)).toEqual({
    shared: 'shared',
    main: null,
    preload: 'preload-only',
    renderer: null,
  });

  await result.close();
});

test('@rselectron/core/node declares RSELECTRON_RENDERER_URL without ambient app types', () => {
  const appRoot = createRoot('node-types');
  writeFileSync(
    join(appRoot, 'package.json'),
    JSON.stringify({
      name: 'node-types-fixture',
      private: true,
      type: 'module',
    }),
  );
  writeFileSync(
    join(appRoot, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
        noEmit: true,
        strict: true,
        typeRoots: [join(repositoryRoot, 'node_modules/@types')],
        types: ['node'],
      },
      include: ['main.ts'],
    }),
  );
  writeFileSync(
    join(appRoot, 'main.ts'),
    [
      "import '@rselectron/core/node';",
      '',
      'const url: string | undefined = process.env.RSELECTRON_RENDERER_URL;',
      'void url;',
      '',
    ].join('\n'),
  );

  mkdirSync(join(appRoot, 'node_modules/@rselectron/core'), {
    recursive: true,
  });
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

  const tsc = join(repositoryRoot, 'node_modules/typescript/bin/tsc');
  const check = spawnSync(process.execPath, [tsc, '-p', appRoot], {
    encoding: 'utf8',
  });
  expect(check.status, check.stdout + check.stderr).toBe(0);
});
