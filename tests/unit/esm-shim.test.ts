import { afterAll, expect, test } from '@rstest/core';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from '../../packages/rselectron/src/index.ts';

const roots: string[] = [];

/** Marker unique to the on-demand thin createRequire shim (not Rspack node-commonjs). */
const THIN_SHIM_MARKER = 'rselectron-esm-require-shim';

function createRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-shim-${name}-`));
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
    `${JSON.stringify({ name: 'shim-app', private: true, dependencies }, null, 2)}\n`,
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

function esmMainConfig(appRoot: string, tools?: Record<string, unknown>) {
  return {
    main: {
      root: join(appRoot, 'main'),
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: true,
        distPath: { root: join(appRoot, 'out/main') },
        filename: { js: '[name].mjs' },
        filenameHash: false,
        minify: false,
        module: true,
        target: 'node' as const,
      },
      ...(tools === undefined ? {} : { tools }),
      electron: { format: 'esm' as const },
    },
  };
}

test('ESM Main without free require does not inject thin createRequire shim', async () => {
  const appRoot = createRoot('no-require');
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
      "import leftpad from 'leftpad';",
      'console.log(typeof electron, leftpad());',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: esmMainConfig(appRoot),
  });

  try {
    const bundle = readFileSync(join(appRoot, 'out/main/index.mjs'), 'utf8');
    expect(bundle).not.toContain(THIN_SHIM_MARKER);
    expect(bundle).not.toMatch(/\brequire\s*\(/);
    expect(bundle).not.toMatch(/\brequire\.resolve\s*\(/);
  } finally {
    await result.close();
  }
});

test('ESM Main with residual free require gains thin createRequire shim and loads', async () => {
  const appRoot = createRoot('free-require');
  writeAppManifest(appRoot);
  writeFakeDependency(
    appRoot,
    'leftpad',
    'module.exports = function leftpad() { return "dep"; };\n',
  );
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  // Force a CommonJS external so the ESM graph retains bare require(...).
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import leftpad from 'leftpad';",
      'process.stdout.write(leftpad());',
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: esmMainConfig(appRoot, {
      rspack: {
        externals: { leftpad: 'commonjs leftpad' },
      },
    }),
  });

  try {
    const bundle = readFileSync(join(appRoot, 'out/main/index.mjs'), 'utf8');
    expect(bundle).toMatch(/\brequire\s*\(/);
    expect(bundle).toContain(THIN_SHIM_MARKER);
    expect(bundle).toMatch(/createRequire\s*\(\s*import\.meta\.url\s*\)/);
    // Thin shim only — not electron-vite full dirname/filename MagicString banner.
    expect(bundle).not.toContain('__cjs_url__');
    expect(bundle).not.toContain('__cjs_path__');

    const run = spawnSync(
      process.execPath,
      [join(appRoot, 'out/main/index.mjs')],
      {
        cwd: appRoot,
        encoding: 'utf8',
      },
    );
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toBe('dep');
    expect(run.stderr).not.toMatch(/require is not defined/i);
  } finally {
    await result.close();
  }
});

test('ESM Main __dirname uses Rspack node-module, not MagicString dirname shim', async () => {
  const appRoot = createRoot('dirname');
  writeAppManifest(appRoot, {});
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(
    join(appRoot, 'main/index.ts'),
    [
      "import { join } from 'node:path';",
      "process.stdout.write(join(__dirname, 'marker'));",
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: esmMainConfig(appRoot),
  });

  try {
    const bundle = readFileSync(join(appRoot, 'out/main/index.mjs'), 'utf8');
    // Rspack node-module rewrites via import.meta; no free require → no thin shim.
    expect(bundle).toMatch(/import\.meta(?:\.url|\.dirname)/);
    expect(bundle).not.toMatch(/\b__dirname\b/);
    expect(bundle).not.toContain(THIN_SHIM_MARKER);
    expect(bundle).not.toContain('__cjs_url__');
    expect(bundle).not.toContain('__cjs_path__');

    const run = spawnSync(
      process.execPath,
      [join(appRoot, 'out/main/index.mjs')],
      {
        encoding: 'utf8',
      },
    );
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toContain('marker');
  } finally {
    await result.close();
  }
});
