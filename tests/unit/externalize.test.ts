import { afterAll, expect, test } from '@rstest/core';
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../packages/rselectron/src/index.ts';

const roots: string[] = [];

function createRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-ext-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

function writeAppManifest(
  appRoot: string,
  dependencies: Record<string, string> = { leftpad: '1.0.0' },
): void {
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'ext-app', private: true, dependencies }, null, 2)}\n`,
  );
}

function writeFakeDependency(
  appRoot: string,
  name: string,
  body: string,
): void {
  const depRoot = join(appRoot, 'node_modules', name);
  mkdirSync(depRoot, { recursive: true });
  writeFileSync(
    join(depRoot, 'package.json'),
    `${JSON.stringify({ name, version: '1.0.0', main: 'index.js' }, null, 2)}\n`,
  );
  writeFileSync(join(depRoot, 'index.js'), body);
}

test('ESM Main routes require-originated externals through createRequire', async () => {
  const appRoot = createRoot('esm-require');
  writeAppManifest(appRoot);
  writeFakeDependency(
    appRoot,
    'leftpad',
    'module.exports = function leftpad() { return "dep"; };\n',
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    ["const leftpad = require('leftpad');", 'console.log(leftpad());', ''].join(
      '\n',
    ),
  );

  const result = await build({
    cwd: appRoot,
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].mjs' },
          filenameHash: false,
          module: true,
          target: 'node',
        },
        electron: { format: 'esm' },
      },
    },
  });

  const bundle = readFileSync(join(appRoot, 'out/main/index.mjs'), 'utf8');
  expect(bundle).toMatch(/createRequire|node-commonjs/);
  expect(bundle).not.toMatch(
    /module\.exports\s*=\s*require\(["']leftpad["']\)/,
  );
  expect(bundle).not.toContain('return "dep"');
  await result.close();
});

test('ESM Main externalizes static imports without bare require', async () => {
  const appRoot = createRoot('esm-static');
  writeAppManifest(appRoot);
  writeFakeDependency(
    appRoot,
    'leftpad',
    'module.exports = function leftpad() { return "dep"; };\n',
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import electron from 'electron';",
      "import fs from 'node:fs';",
      "import leftpad from 'leftpad';",
      'console.log(typeof electron, typeof fs.existsSync, leftpad());',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].mjs' },
          filenameHash: false,
          module: true,
          target: 'node',
        },
        electron: { format: 'esm' },
      },
    },
  });

  const bundle = readFileSync(join(appRoot, 'out/main/index.mjs'), 'utf8');
  expect(bundle).not.toContain('require("electron")');
  expect(bundle).not.toMatch(/require\(["']leftpad["']\)/);
  expect(bundle).toMatch(/import\s+.*["']electron["']|from\s+["']electron["']/);
  expect(bundle).not.toContain('return "dep"');
  await result.close();
});

test('Main and Preload always externalize Electron, Node builtins, and dependencies', async () => {
  const appRoot = createRoot('defaults');
  writeAppManifest(appRoot);
  writeFakeDependency(
    appRoot,
    'leftpad',
    'module.exports = function leftpad() { return "dep"; };\n',
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import electron from 'electron';",
      "import fs from 'node:fs';",
      "import leftpad from 'leftpad';",
      'console.log(typeof electron, typeof fs.existsSync, leftpad());',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
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
    },
  });

  const bundle = readFileSync(join(appRoot, 'out/main/index.cjs'), 'utf8');
  expect(bundle).toContain('require("electron")');
  expect(bundle).toMatch(/require\(["']node:fs["']\)|require\(["']fs["']\)/);
  expect(bundle).toContain('require("leftpad")');
  expect(bundle).not.toContain('return "dep"');
  await result.close();
});

test('externalizeDeps include and exclude controls package bundling', async () => {
  const appRoot = createRoot('include-exclude');
  writeAppManifest(appRoot, { leftpad: '1.0.0', rightpad: '1.0.0' });
  writeFakeDependency(
    appRoot,
    'leftpad',
    'module.exports = function leftpad() { return "left"; };\n',
  );
  writeFakeDependency(
    appRoot,
    'rightpad',
    'module.exports = function rightpad() { return "right"; };\n',
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import leftpad from 'leftpad';",
      "import rightpad from 'rightpad';",
      'console.log(leftpad(), rightpad());',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
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
        electron: {
          format: 'cjs',
          externalizeDeps: {
            include: ['leftpad'],
            exclude: ['rightpad'],
          },
        },
      },
    },
  });

  const bundle = readFileSync(join(appRoot, 'out/main/index.cjs'), 'utf8');
  expect(bundle).toContain('return "left"');
  expect(bundle).toContain('require("rightpad")');
  expect(bundle).not.toContain('return "right"');
  await result.close();
});

test('isolated Preload entries have no shared chunks and default to bundling deps', async () => {
  const appRoot = createRoot('isolated-preload');
  writeAppManifest(appRoot);
  writeFakeDependency(
    appRoot,
    'leftpad',
    'module.exports = function leftpad() { return "isolated-dep"; };\n',
  );
  mkdirSync(join(appRoot, 'preload'), { recursive: true });
  writeFileSync(
    join(appRoot, 'preload/one.ts'),
    "import leftpad from 'leftpad';\nconsole.log('one', leftpad());\n",
  );
  writeFileSync(
    join(appRoot, 'preload/two.ts'),
    "import leftpad from 'leftpad';\nconsole.log('two', leftpad());\n",
  );

  const result = await build({
    cwd: appRoot,
    config: {
      preload: {
        root: join(appRoot, 'preload'),
        source: {
          entry: {
            one: './one.ts',
            two: './two.ts',
          },
        },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/preload') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          target: 'node',
        },
        electron: {
          format: 'cjs',
          isolatedEntries: true,
        },
      },
    },
  });

  const one = readFileSync(join(appRoot, 'out/preload/one.cjs'), 'utf8');
  const two = readFileSync(join(appRoot, 'out/preload/two.cjs'), 'utf8');
  expect(one).toContain('isolated-dep');
  expect(two).toContain('isolated-dep');
  expect(
    result.roles.preload?.paths.every((path) => path.endsWith('.cjs')),
  ).toBe(true);
  expect(
    result.roles.preload?.paths.some((path) =>
      /async|chunk|vendor/i.test(path),
    ),
  ).toBe(false);
  await result.close();
});

test('explicit Preload isolation with externalizeDeps true emits a diagnostic', async () => {
  const appRoot = createRoot('conflict');
  writeAppManifest(appRoot, {});
  mkdirSync(join(appRoot, 'preload'), { recursive: true });
  writeFileSync(join(appRoot, 'preload/index.ts'), "console.log('preload');\n");

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
          module: false,
          target: 'node',
        },
        electron: {
          format: 'cjs',
          isolatedEntries: true,
          externalizeDeps: true,
        },
      },
    },
  });

  expect(result.warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'RSELECTRON_PRELOAD_ISOLATION_EXTERNALIZE_CONFLICT',
        role: 'preload',
      }),
    ]),
  );
  await result.close();
});

function writeImportOnlyDependency(
  appRoot: string,
  name: string,
  options: { withSubpath?: boolean } = {},
): void {
  const depRoot = join(appRoot, 'node_modules', name);
  mkdirSync(depRoot, { recursive: true });
  const exports: Record<string, { import: string }> = {
    '.': { import: './index.js' },
  };
  if (options.withSubpath === true) {
    exports['./v2'] = { import: './v2.js' };
    writeFileSync(join(depRoot, 'v2.js'), 'export const v2 = "v2";\n');
  }
  writeFileSync(
    join(depRoot, 'package.json'),
    `${JSON.stringify(
      {
        name,
        version: '1.0.0',
        type: 'module',
        exports,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(depRoot, 'index.js'), 'export default "esm-only";\n');
}

test('CJS Main warns when CommonJS-externalizing an import-only package and subpath', async () => {
  const appRoot = createRoot('import-only-warn');
  writeAppManifest(appRoot, { 'esm-only-lib': '1.0.0' });
  writeImportOnlyDependency(appRoot, 'esm-only-lib', { withSubpath: true });
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import value from 'esm-only-lib';",
      "import { v2 } from 'esm-only-lib/v2';",
      'console.log(value, v2);',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
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
    },
  });

  expect(result.warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'RSELECTRON_IMPORT_ONLY_EXTERNAL',
        role: 'main',
        message: expect.stringContaining('esm-only-lib'),
      }),
      expect.objectContaining({
        code: 'RSELECTRON_IMPORT_ONLY_EXTERNAL',
        role: 'main',
        message: expect.stringContaining('esm-only-lib/v2'),
      }),
    ]),
  );
  expect(
    result.warnings.some(
      (warning) =>
        warning.code === 'RSELECTRON_IMPORT_ONLY_EXTERNAL' &&
        /include|format:\s*'esm'|format: "esm"/i.test(warning.message),
    ),
  ).toBe(true);

  const bundle = readFileSync(join(appRoot, 'out/main/index.cjs'), 'utf8');
  expect(bundle).toContain('require("esm-only-lib")');
  await result.close();
});

test('CJS Preload warns for import-only externals; include and ESM do not', async () => {
  const appRoot = createRoot('import-only-variants');
  writeAppManifest(appRoot, { 'esm-only-lib': '1.0.0' });
  writeImportOnlyDependency(appRoot, 'esm-only-lib');

  mkdirSync(join(appRoot, 'preload'), { recursive: true });
  writeFileSync(
    join(appRoot, 'preload/index.ts'),
    "import value from 'esm-only-lib';\nconsole.log(value);\n",
  );

  const preloadResult = await build({
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
          module: false,
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    },
  });
  expect(preloadResult.warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'RSELECTRON_IMPORT_ONLY_EXTERNAL',
        role: 'preload',
        message: expect.stringContaining('esm-only-lib'),
      }),
    ]),
  );
  await preloadResult.close();

  const includeRoot = createRoot('import-only-include');
  writeAppManifest(includeRoot, { 'esm-only-lib': '1.0.0' });
  writeImportOnlyDependency(includeRoot, 'esm-only-lib');
  mkdirSync(join(includeRoot, 'main'), { recursive: true });
  writeFileSync(
    join(includeRoot, 'main/index.ts'),
    "import value from 'esm-only-lib';\nconsole.log(value);\n",
  );
  const includeResult = await build({
    cwd: includeRoot,
    config: {
      main: {
        root: join(includeRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(includeRoot, 'out/main') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          target: 'node',
        },
        electron: {
          format: 'cjs',
          externalizeDeps: { include: ['esm-only-lib'] },
        },
      },
    },
  });
  expect(
    includeResult.warnings.filter(
      (warning) => warning.code === 'RSELECTRON_IMPORT_ONLY_EXTERNAL',
    ),
  ).toEqual([]);
  await includeResult.close();

  const esmRoot = createRoot('import-only-esm');
  writeAppManifest(esmRoot, { 'esm-only-lib': '1.0.0' });
  writeImportOnlyDependency(esmRoot, 'esm-only-lib');
  mkdirSync(join(esmRoot, 'main'), { recursive: true });
  writeFileSync(
    join(esmRoot, 'main/index.ts'),
    "import value from 'esm-only-lib';\nconsole.log(value);\n",
  );
  const esmResult = await build({
    cwd: esmRoot,
    config: {
      main: {
        root: join(esmRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(esmRoot, 'out/main') },
          filename: { js: '[name].mjs' },
          filenameHash: false,
          module: true,
          target: 'node',
        },
        electron: { format: 'esm' },
      },
    },
  });
  expect(
    esmResult.warnings.filter(
      (warning) => warning.code === 'RSELECTRON_IMPORT_ONLY_EXTERNAL',
    ),
  ).toEqual([]);
  await esmResult.close();
});

test('CJS Main never emits import-only warnings for electron or Node builtins', async () => {
  const appRoot = createRoot('import-only-builtins');
  writeAppManifest(appRoot, {});
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import electron from 'electron';",
      "import fs from 'node:fs';",
      "import path from 'path';",
      'console.log(typeof electron, typeof fs.existsSync, path.join);',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
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
    },
  });

  expect(
    result.warnings.filter(
      (warning) => warning.code === 'RSELECTRON_IMPORT_ONLY_EXTERNAL',
    ),
  ).toEqual([]);
  await result.close();
});
