import { afterAll, expect, test } from '@rstest/core';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { build } from '../../packages/rselectron/src/index.ts';

const roots: string[] = [];
const repositoryRoot = resolve(import.meta.dirname, '../..');
const hostAddonProbeRoot = mkdtempSync(
  join(tmpdir(), 'rselectron-native-probe-'),
);
let hostAddonSkipReason = `host C toolchain or node_api.h unavailable on ${process.platform}/${process.arch}`;

/** Minimal WASM module exporting `add(i32, i32) -> i32`. */
const addWasmBytes = Buffer.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x07, 0x01, 0x60, 0x02,
  0x7f, 0x7f, 0x01, 0x7f, 0x03, 0x02, 0x01, 0x00, 0x07, 0x07, 0x01, 0x03, 0x61,
  0x64, 0x64, 0x00, 0x00, 0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01,
  0x6a, 0x0b,
]);

const nativeSource = `#include <node_api.h>

static napi_value Hello(napi_env env, napi_callback_info info) {
  napi_value result;
  napi_create_string_utf8(env, "hello-native", NAPI_AUTO_LENGTH, &result);
  return result;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, NULL, 0, Hello, NULL, &fn);
  napi_set_named_property(env, exports, "hello", fn);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
`;

function createRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-native-${name}-`));
  roots.push(root);
  return root;
}

function findNodeApiInclude(): string | undefined {
  const candidates = [
    '/opt/homebrew/include/node',
    '/usr/local/include/node',
    '/opt/homebrew/Cellar/node/26.5.0/include/node',
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'node_api.h'))) {
      return candidate;
    }
  }

  const probed = spawnSync(
    'find',
    [
      '/opt/homebrew/Cellar/node',
      '/usr/local',
      '-name',
      'node_api.h',
      '-print',
      '-quit',
    ],
    { encoding: 'utf8' },
  );
  const first = probed.stdout?.trim();
  return first === undefined || first.length === 0 ? undefined : dirname(first);
}

function compileHostNativeAddon(outputPath: string): boolean {
  const includeDir = findNodeApiInclude();
  const compiler = existsSync('/usr/bin/clang')
    ? '/usr/bin/clang'
    : existsSync('/usr/bin/cc')
      ? '/usr/bin/cc'
      : undefined;
  if (includeDir === undefined || compiler === undefined) {
    hostAddonSkipReason = `host C toolchain or node_api.h unavailable on ${process.platform}/${process.arch}`;
    return false;
  }

  const sourcePath = `${outputPath}.c`;
  writeFileSync(sourcePath, nativeSource);
  const compiled = spawnSync(
    compiler,
    [
      '-shared',
      '-fPIC',
      '-undefined',
      'dynamic_lookup',
      `-I${includeDir}`,
      '-o',
      outputPath,
      sourcePath,
    ],
    { encoding: 'utf8' },
  );
  if (compiled.status !== 0 || !existsSync(outputPath)) {
    hostAddonSkipReason = `failed to compile host-native addon on ${process.platform}/${process.arch}: ${compiled.stderr || compiled.stdout}`;
    return false;
  }
  return true;
}

const hostAddonProbePath = join(hostAddonProbeRoot, 'hello.node');
const hostAddonPath = compileHostNativeAddon(hostAddonProbePath)
  ? hostAddonProbePath
  : undefined;
if (hostAddonPath === undefined) {
  console.warn(`[evidence-skip] native .node runtime: ${hostAddonSkipReason}`);
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

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
  rmSync(hostAddonProbeRoot, { force: true, recursive: true });
});

test('*.wasm?loader instantiates emitted WASM from Main production output', async () => {
  const appRoot = createRoot('wasm');
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'wasm-app', private: true }, null, 2)}\n`,
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  mkdirSync(join(appRoot, 'resources'), { recursive: true });
  writeFileSync(join(appRoot, 'resources/add.wasm'), addWasmBytes);
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import loadWasm from '../resources/add.wasm?loader';",
      'loadWasm().then((instance) => {',
      '  const add = instance.exports.add as (a: number, b: number) => number;',
      '  process.stdout.write(String(add(5, 6)));',
      '}).catch((error) => {',
      '  console.error(error);',
      '  process.exitCode = 1;',
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
      { encoding: 'utf8' },
    );
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toBe('11');

    const outFiles = readdirSync(join(appRoot, 'out/main'), {
      recursive: true,
    }).map(String);
    expect(outFiles.some((name) => name.endsWith('.wasm'))).toBe(false);
    expect(existsSync(join(appRoot, 'resources/add.wasm'))).toBe(true);
  } finally {
    await result.close();
  }
});

test.skipIf(hostAddonPath === undefined)(
  'host-native .node imports load without bundling or transforming the addon',
  async () => {
    if (hostAddonPath === undefined) {
      throw new Error(hostAddonSkipReason);
    }

    const appRoot = createRoot('node-addon');
    mkdirSync(join(appRoot, 'resources'), { recursive: true });
    copyFileSync(hostAddonPath, join(appRoot, 'resources/hello.node'));

    writeFileSync(
      join(appRoot, 'package.json'),
      `${JSON.stringify({ name: 'native-app', private: true }, null, 2)}\n`,
    );
    mkdirSync(join(appRoot, 'main'), { recursive: true });
    writeFileSync(
      join(appRoot, 'main/index.ts'),
      [
        "import addon from '../resources/hello.node';",
        'const native = addon as { hello: () => string };',
        'process.stdout.write(native.hello());',
        '',
      ].join('\n'),
    );

    const result = await build({
      cwd: appRoot,
      config: mainConfig(appRoot),
    });

    try {
      const mainEntry = join(appRoot, 'out/main/index.cjs');
      const bundle = readFileSync(mainEntry, 'utf8');
      expect(bundle).toContain('hello.node');
      expect(bundle).not.toContain('hello-native');
      expect(bundle).toContain('rselectron-native-node-loader');

      const run = spawnSync(process.execPath, [mainEntry], {
        encoding: 'utf8',
      });
      expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
      expect(run.stdout).toBe('hello-native');
    } finally {
      await result.close();
    }
  },
);

test('*.wasm?loader works for Preload production output', async () => {
  const appRoot = createRoot('wasm-preload');
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'wasm-preload-app', private: true }, null, 2)}\n`,
  );
  mkdirSync(join(appRoot, 'preload'), { recursive: true });
  mkdirSync(join(appRoot, 'resources'), { recursive: true });
  writeFileSync(join(appRoot, 'resources/add.wasm'), addWasmBytes);
  writeFileSync(
    join(appRoot, 'preload/index.ts'),
    [
      "import loadWasm from '../resources/add.wasm?loader';",
      'loadWasm().then((instance) => {',
      '  const add = instance.exports.add as (a: number, b: number) => number;',
      '  process.stdout.write(String(add(2, 9)));',
      '}).catch((error) => {',
      '  console.error(error);',
      '  process.exitCode = 1;',
      '});',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: {
      preload: {
        root: join(appRoot, 'preload'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/preload') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          minify: false,
          module: false,
          target: 'node' as const,
        },
        tools: { rspack: { externals: ['electron'] } },
        electron: { format: 'cjs' as const },
      },
    },
  });

  try {
    const run = spawnSync(
      process.execPath,
      [join(appRoot, 'out/preload/index.cjs')],
      { encoding: 'utf8' },
    );
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toBe('11');
  } finally {
    await result.close();
  }
});

test('@rselectron/core/node declares WASM loader and native .node module forms', async () => {
  const types = readFileSync(
    join(repositoryRoot, 'packages/rselectron/node.d.ts'),
    'utf8',
  );
  expect(types).toContain("declare module '*.wasm?loader'");
  expect(types).toContain("declare module '*.node'");
});
