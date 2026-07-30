import { afterAll, beforeAll, expect, test } from '@rstest/core';
import { spawnSync } from 'node:child_process';
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
  createServer,
  type RselectronConfig,
} from '../../packages/rselectron/src/index.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(import.meta.dirname, '../fixtures/vanilla-dev');
const outputRoot = join(fixtureRoot, 'out');
const markerPath = join(outputRoot, 'launch-marker.json');
const rendererSource = join(fixtureRoot, 'renderer/index.ts');
const originalRendererSource = readFileSync(rendererSource, 'utf8');

function createVanillaDevConfig(): RselectronConfig {
  return {
    main: {
      root: join(fixtureRoot, 'main'),
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: true,
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
        cleanDistPath: true,
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
        port: 3500 + Math.floor(Math.random() * 200),
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

beforeAll(() => {
  const electronLink = join(fixtureRoot, 'node_modules/electron');
  mkdirSync(join(fixtureRoot, 'node_modules'), { recursive: true });
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
});

afterAll(() => {
  writeFileSync(rendererSource, originalRendererSource);
  rmSync(outputRoot, { force: true, recursive: true });
  rmSync(markerPath, { force: true });
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

  const scriptUrls = [...html.matchAll(/\bsrc="([^"]+)"/g)].map(
    (match) => match[1]!,
  );
  for (const scriptUrl of scriptUrls) {
    const absolute = new URL(scriptUrl, url);
    absolute.searchParams.set('t', String(Date.now()));
    const scriptResponse = await fetch(absolute);
    const body = await scriptResponse.text();
    if (body.includes(needle)) {
      return true;
    }
  }

  return false;
}

test('createServer launches Electron after Roles are ready with renderer URL', async () => {
  rmSync(markerPath, { force: true });

  const server = await createServer({
    config: createVanillaDevConfig(),
    cwd: fixtureRoot,
  });

  try {
    expect(server.urls.length).toBeGreaterThan(0);
    expect(server.electronProcess.pid).toBeTypeOf('number');

    await waitFor(() => existsSync(markerPath));
    const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as {
      pid: number;
      url: string;
    };
    expect(marker.url).toBe(server.urls[0]);
    expect(marker.pid).toBe(server.electronProcess.pid);

    expect(
      await documentContains(server.urls[0]!, 'rselectron-dev-ready'),
    ).toBe(true);
  } finally {
    await server.close();
    await server.close();
  }

  expect(server.electronProcess.exitCode).not.toBeNull();
});

test('Renderer HMR updates without restarting Electron', async () => {
  rmSync(markerPath, { force: true });
  writeFileSync(rendererSource, originalRendererSource);

  const server = await createServer({
    config: createVanillaDevConfig(),
    cwd: fixtureRoot,
  });

  const electronPid = server.electronProcess.pid;

  try {
    await waitFor(() => existsSync(markerPath));
    await waitFor(() =>
      documentContains(server.urls[0]!, 'rselectron-dev-ready'),
    );

    writeFileSync(
      rendererSource,
      [
        "const app = document.querySelector('#app');",
        'if (app !== null) {',
        "  app.textContent = 'rselectron-hmr-updated';",
        '}',
        '',
      ].join('\n'),
    );

    await waitFor(() =>
      documentContains(server.urls[0]!, 'rselectron-hmr-updated'),
    );

    expect(server.electronProcess.pid).toBe(electronPid);
    expect(server.electronProcess.exitCode).toBeNull();
  } finally {
    writeFileSync(rendererSource, originalRendererSource);
    await server.close();
  }
});

test('Electron exit closes the Development session', async () => {
  rmSync(markerPath, { force: true });

  const server = await createServer({
    config: createVanillaDevConfig(),
    cwd: fixtureRoot,
  });

  await waitFor(() => existsSync(markerPath));
  const rendererUrl = server.urls[0]!;

  server.electronProcess.kill();
  if (
    process.platform === 'win32' &&
    server.electronProcess.pid !== undefined &&
    server.electronProcess.exitCode === null
  ) {
    spawnSync(
      'taskkill',
      ['/pid', String(server.electronProcess.pid), '/T', '/F'],
      { encoding: 'utf8', stdio: 'ignore', windowsHide: true },
    );
  }
  await waitFor(() => server.electronProcess.exitCode !== null);
  await waitFor(async () => {
    try {
      await fetch(rendererUrl);
      return false;
    } catch {
      return true;
    }
  });

  await server.close();
});
