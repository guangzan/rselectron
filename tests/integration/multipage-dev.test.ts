import { afterAll, beforeAll, test } from '@rstest/core';
import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createServer,
  type RselectronConfig,
} from '../../packages/rselectron/src/index.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(import.meta.dirname, '../fixtures/vanilla-multipage');
const outputRoot = join(fixtureRoot, 'out');
const markerPath = join(outputRoot, 'launch-marker.json');

function createMultipageConfig(): RselectronConfig {
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
      source: {
        entry: {
          'page-a': './page-a/index.ts',
          'page-b': './page-b/index.ts',
        },
      },
      html: {
        template({ entryName }) {
          return `./${entryName}/index.html`;
        },
      },
      server: {
        port: 4300 + Math.floor(Math.random() * 200),
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

test('one Renderer Role serves a two-page multipage fixture', async () => {
  rmSync(markerPath, { force: true });

  const server = await createServer({
    config: createMultipageConfig(),
    cwd: fixtureRoot,
  });

  try {
    await waitFor(() => existsSync(markerPath));
    const origin = new URL(server.urls[0]!).origin;
    await waitFor(() => documentContains(`${origin}/page-a`, 'page-a-ready'));
    await waitFor(() => documentContains(`${origin}/page-b`, 'page-b-ready'));
  } finally {
    await server.close();
  }
});
