import { afterAll, beforeAll, expect, test } from '@rstest/core';
import { pluginReact } from '@rsbuild/plugin-react';
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
const fixtureRoot = resolve(import.meta.dirname, '../fixtures/vanilla-react');
const outputRoot = join(fixtureRoot, 'out');
const markerPath = join(outputRoot, 'launch-marker.json');
const appSource = join(fixtureRoot, 'renderer/App.tsx');
const originalAppSource = readFileSync(appSource, 'utf8');

function createReactConfig(): RselectronConfig {
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
      plugins: [pluginReact()],
      source: { entry: { index: './index.tsx' } },
      html: { template: './index.html' },
      server: {
        port: 4100 + Math.floor(Math.random() * 200),
        printUrls: false,
        strictPort: false,
      },
      output: {
        cleanDistPath: true,
        distPath: { root: join(outputRoot, 'renderer') },
        filenameHash: false,
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
  writeFileSync(appSource, originalAppSource);
  rmSync(outputRoot, { force: true, recursive: true });
  rmSync(markerPath, { force: true });
});

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 25_000,
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
  try {
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
  } catch {
    return false;
  }

  return false;
}

test('React Renderer builds, launches, and HMR-updates without Electron restart', async () => {
  writeFileSync(appSource, originalAppSource);
  rmSync(markerPath, { force: true });

  const server = await createServer({
    config: createReactConfig(),
    cwd: fixtureRoot,
  });
  const electronPid = server.electronProcess.pid;

  try {
    await waitFor(() => existsSync(markerPath));
    await waitFor(() =>
      documentContains(server.urls[0]!, 'rselectron-react-ready'),
    );

    writeFileSync(
      appSource,
      [
        'export function App(): React.ReactElement {',
        '  return <div id="app">rselectron-react-hmr</div>;',
        '}',
        '',
      ].join('\n'),
    );

    await waitFor(() =>
      documentContains(server.urls[0]!, 'rselectron-react-hmr'),
    );
    expect(server.electronProcess.pid).toBe(electronPid);
    expect(server.electronProcess.exitCode).toBeNull();
  } finally {
    writeFileSync(appSource, originalAppSource);
    await server.close();
  }
});
