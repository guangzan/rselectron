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
  createServer,
  type RselectronConfig,
} from '../../packages/rselectron/src/index.ts';
import { runCli } from '../../packages/cli/src/index.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(import.meta.dirname, '../fixtures/vanilla-watch');
const outputRoot = join(fixtureRoot, 'out');
const markerPath = join(outputRoot, 'launch-marker.json');
const mainSource = join(fixtureRoot, 'main/index.ts');
const preloadSource = join(fixtureRoot, 'preload/index.ts');
const originalMainSource = readFileSync(mainSource, 'utf8');
const originalPreloadSource = readFileSync(preloadSource, 'utf8');

function createVanillaWatchConfig(
  roleWatch?: Partial<Record<'main' | 'preload', boolean>>,
): RselectronConfig {
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
      electron: {
        format: 'cjs',
        ...(roleWatch?.main === undefined ? {} : { watch: roleWatch.main }),
      },
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
      electron: {
        format: 'cjs',
        ...(roleWatch?.preload === undefined
          ? {}
          : { watch: roleWatch.preload }),
      },
    },
    renderer: {
      root: join(fixtureRoot, 'renderer'),
      source: { entry: { index: './index.ts' } },
      html: { template: './index.html' },
      server: {
        port: 3700 + Math.floor(Math.random() * 200),
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
  writeFileSync(mainSource, originalMainSource);
  writeFileSync(preloadSource, originalPreloadSource);
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

function readMarker(): { pid: number; url: string } {
  return JSON.parse(readFileSync(markerPath, 'utf8')) as {
    pid: number;
    url: string;
  };
}

test('CLI rejects unsupported --watch Role values', async () => {
  const rejected: string[] = [];
  const status = await runCli(['dev', '--watch=renderer'], {
    stderr: (message) => {
      rejected.push(message);
    },
    stdout: () => undefined,
  });
  expect(status).toBe(1);
  expect(rejected.join('')).toContain('RSELECTRON_DEV_WATCH_INVALID');
});

test('watched Main rebuild restarts Electron once after debounce', async () => {
  rmSync(markerPath, { force: true });
  writeFileSync(mainSource, originalMainSource);

  const server = await createServer({
    config: createVanillaWatchConfig(),
    cwd: fixtureRoot,
    watch: 'main',
  });

  try {
    await waitFor(() => existsSync(markerPath));
    const first = readMarker();
    expect(first.pid).toBe(server.electronProcess.pid);

    writeFileSync(
      mainSource,
      originalMainSource.replace('url,', 'url,\n        watched: true,'),
    );

    // Wait until marker and live process agree. Rapid double-compiles used to
    // clear electronRef between stop-for-promote and debounced respawn.
    await waitFor(() => {
      if (!existsSync(markerPath)) {
        return false;
      }
      const marker = readMarker();
      if (marker.pid === first.pid) {
        return false;
      }
      try {
        return server.electronProcess.pid === marker.pid;
      } catch {
        return false;
      }
    });

    const second = readMarker();
    expect(second.pid).not.toBe(first.pid);
    expect(server.electronProcess.pid).toBe(second.pid);
  } finally {
    writeFileSync(mainSource, originalMainSource);
    await server.close();
  }
});

test('watched Preload rebuild updates output without restarting Electron', async () => {
  rmSync(markerPath, { force: true });
  writeFileSync(preloadSource, originalPreloadSource);

  const server = await createServer({
    config: createVanillaWatchConfig(),
    cwd: fixtureRoot,
    watch: 'preload',
  });

  const electronPid = server.electronProcess.pid;

  try {
    await waitFor(() => existsSync(markerPath));
    const preloadOutput = join(outputRoot, 'preload/index.cjs');
    const before = readFileSync(preloadOutput);

    writeFileSync(
      preloadSource,
      `${originalPreloadSource}\nexport const watched = ${Date.now()};\n`,
    );

    await waitFor(() => {
      if (!existsSync(preloadOutput)) {
        return false;
      }
      return !readFileSync(preloadOutput).equals(before);
    });

    expect(server.electronProcess.pid).toBe(electronPid);
    expect(server.electronProcess.exitCode).toBeNull();
  } finally {
    writeFileSync(preloadSource, originalPreloadSource);
    await server.close();
  }
});

test('failed watched Main rebuild preserves the active generation', async () => {
  rmSync(markerPath, { force: true });
  writeFileSync(mainSource, originalMainSource);

  const server = await createServer({
    config: createVanillaWatchConfig(),
    cwd: fixtureRoot,
    watch: 'main',
  });

  try {
    await waitFor(() => existsSync(markerPath));
    const mainOutput = join(outputRoot, 'main/index.cjs');
    const before = readFileSync(mainOutput, 'utf8');
    const firstPid = readMarker().pid;

    writeFileSync(mainSource, 'this is not valid typescript {{{{\n');

    await delay(2000);
    expect(readFileSync(mainOutput, 'utf8')).toBe(before);
    expect(readMarker().pid).toBe(firstPid);
    expect(server.electronProcess.pid).toBe(firstPid);
  } finally {
    writeFileSync(mainSource, originalMainSource);
    await server.close();
  }
});

test('CLI watch selection overrides Role-level electron.watch', async () => {
  rmSync(markerPath, { force: true });
  writeFileSync(mainSource, originalMainSource);

  const server = await createServer({
    config: createVanillaWatchConfig({ main: true }),
    cwd: fixtureRoot,
    watch: false,
  });

  try {
    await waitFor(() => existsSync(markerPath));
    const first = readMarker();

    writeFileSync(
      mainSource,
      originalMainSource.replace('url,', 'url,\n        ignored: true,'),
    );

    await delay(1500);
    expect(readMarker().pid).toBe(first.pid);
    expect(server.electronProcess.pid).toBe(first.pid);
  } finally {
    writeFileSync(mainSource, originalMainSource);
    await server.close();
  }
});
