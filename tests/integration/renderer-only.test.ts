import { afterAll, beforeAll, expect, test } from '@rstest/core';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  build,
  createServer,
  type RselectronConfig,
} from '../../packages/rselectron/src/index.ts';
import { runCli } from '../../packages/cli/src/index.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(
  import.meta.dirname,
  '../fixtures/vanilla-renderer-only',
);
const outputRoot = join(fixtureRoot, 'out');
const markerPath = join(outputRoot, 'launch-marker.json');
const rendererSource = join(fixtureRoot, 'renderer/index.ts');
const originalRendererSource = [
  "const app = document.querySelector('#app');",
  'if (app !== null) {',
  "  app.textContent = 'rselectron-renderer-only-ready';",
  '}',
  '',
].join('\n');

function createConfig(): RselectronConfig {
  return {
    main: {
      root: join(fixtureRoot, 'main'),
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: false,
        distPath: { root: join(outputRoot, 'main') },
        filename: { js: '[name].cjs' },
        filenameHash: false,
        minify: false,
        module: false,
        target: 'node',
      },
      tools: { rspack: { externals: ['electron'] } },
      electron: { format: 'cjs' },
    },
    preload: {
      root: join(fixtureRoot, 'preload'),
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: false,
        distPath: { root: join(outputRoot, 'preload') },
        filename: { js: '[name].cjs' },
        filenameHash: false,
        minify: false,
        module: false,
        target: 'node',
      },
      tools: { rspack: { externals: ['electron'] } },
      electron: { format: 'cjs' },
    },
    renderer: {
      root: join(fixtureRoot, 'renderer'),
      source: { entry: { index: './index.ts' } },
      html: { template: './index.html' },
      server: {
        port: 3900 + Math.floor(Math.random() * 200),
        printUrls: false,
        strictPort: false,
      },
      output: {
        cleanDistPath: true,
        distPath: { root: join(outputRoot, 'renderer') },
        filenameHash: false,
        module: false,
        target: 'web',
      },
    },
  };
}

beforeAll(async () => {
  mkdirSync(join(fixtureRoot, 'main'), { recursive: true });
  mkdirSync(join(fixtureRoot, 'preload'), { recursive: true });
  mkdirSync(join(fixtureRoot, 'renderer'), { recursive: true });
  mkdirSync(join(fixtureRoot, 'node_modules'), { recursive: true });
  const electronLink = join(fixtureRoot, 'node_modules/electron');
  rmSync(electronLink, { force: true, recursive: true });
  try {
    symlinkSync(
      join(repositoryRoot, 'node_modules/electron'),
      electronLink,
      'dir',
    );
  } catch (error) {
    if (!existsSync(electronLink)) {
      throw error;
    }
  }

  writeFileSync(
    join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'vanilla-renderer-only-fixture',
        private: true,
        main: './out/main/index.cjs',
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(fixtureRoot, 'main/index.ts'),
    [
      "import { app, BrowserWindow } from 'electron';",
      "import { writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      "const markerPath = join(__dirname, '..', 'launch-marker.json');",
      'function createWindow(): void {',
      '  const url = process.env.RSELECTRON_RENDERER_URL;',
      '  writeFileSync(markerPath, JSON.stringify({ pid: process.pid, url }, null, 2));',
      '  if (url === undefined || url.length === 0) throw new Error("missing url");',
      '  const win = new BrowserWindow({',
      '    height: 600, show: false, width: 800,',
      '    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: join(__dirname, "../preload/index.cjs") },',
      '  });',
      '  void win.loadURL(url);',
      '}',
      'app.whenReady().then(() => createWindow());',
      'app.on("window-all-closed", () => app.quit());',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(fixtureRoot, 'preload/index.ts'),
    "import { contextBridge } from 'electron';\ncontextBridge.exposeInMainWorld('rselectron', { ok: true });\n",
  );
  writeFileSync(
    join(fixtureRoot, 'renderer/index.html'),
    '<!doctype html><html><body><div id="app"></div></body></html>\n',
  );
  writeFileSync(rendererSource, originalRendererSource);

  const warm = await build({ config: createConfig(), cwd: fixtureRoot });
  await warm.close();
});

afterAll(() => {
  writeFileSync(rendererSource, originalRendererSource);
  rmSync(outputRoot, { force: true, recursive: true });
});

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 20_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await delay(100);
  }
  throw new Error('Timed out waiting for condition.');
}

async function documentContains(url: string, needle: string): Promise<boolean> {
  const cacheBust = `t=${Date.now()}`;
  const htmlResponse = await fetch(
    url.includes('?') ? `${url}&${cacheBust}` : `${url}?${cacheBust}`,
  );
  const html = await htmlResponse.text();
  if (html.includes(needle)) {
    return true;
  }
  for (const match of html.matchAll(/\bsrc="([^"]+)"/g)) {
    const absolute = new URL(match[1]!, url);
    absolute.searchParams.set('t', String(Date.now()));
    const body = await (await fetch(absolute)).text();
    if (body.includes(needle)) {
      return true;
    }
  }
  return false;
}

test('renderer-only reuses Node Role output without rebuilding Main/Preload', async () => {
  rmSync(markerPath, { force: true });
  const mainBefore = readFileSync(join(outputRoot, 'main/index.cjs'));
  const preloadBefore = readFileSync(join(outputRoot, 'preload/index.cjs'));

  const server = await createServer({
    config: createConfig(),
    cwd: fixtureRoot,
    rendererOnly: true,
  });

  try {
    await waitFor(() => existsSync(markerPath));
    expect(
      readFileSync(join(outputRoot, 'main/index.cjs')).equals(mainBefore),
    ).toBe(true);
    expect(
      readFileSync(join(outputRoot, 'preload/index.cjs')).equals(preloadBefore),
    ).toBe(true);
    expect(
      await documentContains(server.urls[0]!, 'rselectron-renderer-only-ready'),
    ).toBe(true);
  } finally {
    await server.close();
  }
});

test('renderer-only fails when required Main output is missing', async () => {
  rmSync(join(outputRoot, 'main'), { force: true, recursive: true });

  await expect(
    createServer({
      config: createConfig(),
      cwd: fixtureRoot,
      rendererOnly: true,
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_RENDERER_ONLY_OUTPUT_MISSING',
    role: 'main',
  });

  // Restore for later tests / cleanup.
  const warm = await build({ config: createConfig(), cwd: fixtureRoot });
  await warm.close();
});

test('renderer-only supports Renderer HMR', async () => {
  rmSync(markerPath, { force: true });
  writeFileSync(rendererSource, originalRendererSource);

  const server = await createServer({
    config: createConfig(),
    cwd: fixtureRoot,
    rendererOnly: true,
  });

  try {
    await waitFor(() =>
      documentContains(server.urls[0]!, 'rselectron-renderer-only-ready'),
    );
    writeFileSync(
      rendererSource,
      [
        "const app = document.querySelector('#app');",
        'if (app !== null) {',
        "  app.textContent = 'rselectron-renderer-only-hmr';",
        '}',
        '',
      ].join('\n'),
    );
    await waitFor(() =>
      documentContains(server.urls[0]!, 'rselectron-renderer-only-hmr'),
    );
  } finally {
    writeFileSync(rendererSource, originalRendererSource);
    await server.close();
  }
});

test('CLI --renderer-only rejects missing Main output', async () => {
  rmSync(join(outputRoot, 'main'), { force: true, recursive: true });
  writeFileSync(
    join(fixtureRoot, 'rselectron.config.mjs'),
    `export default ${JSON.stringify(createConfig())};\n`,
  );

  const previousCwd = process.cwd();
  process.chdir(fixtureRoot);
  const stderr: string[] = [];
  let status = 1;
  try {
    status = await runCli(
      ['dev', '--renderer-only', '--config', './rselectron.config.mjs'],
      {
        stderr: (message) => {
          stderr.push(message);
        },
        stdout: () => undefined,
      },
    );
  } finally {
    process.chdir(previousCwd);
  }
  expect(status).toBe(1);
  expect(stderr.join('')).toContain('RSELECTRON_RENDERER_ONLY_OUTPUT_MISSING');

  const warm = await build({ config: createConfig(), cwd: fixtureRoot });
  await warm.close();
});
