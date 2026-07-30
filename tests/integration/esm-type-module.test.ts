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

const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(
  import.meta.dirname,
  '../fixtures/vanilla-esm-type-module',
);
const outputRoot = join(fixtureRoot, 'out');
const markerPath = join(outputRoot, 'launch-marker.json');
const leftpadRoot = join(fixtureRoot, 'node_modules/leftpad');

function createEsmTypeModuleConfig(): RselectronConfig {
  return {
    main: {
      root: join(fixtureRoot, 'main'),
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: true,
        distPath: { root: join(outputRoot, 'main') },
        filenameHash: false,
        minify: false,
        target: 'node',
      },
    },
    preload: {
      root: join(fixtureRoot, 'preload'),
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: true,
        distPath: { root: join(outputRoot, 'preload') },
        filenameHash: false,
        minify: false,
        target: 'node',
      },
    },
    renderer: {
      root: join(fixtureRoot, 'renderer'),
      source: { entry: { index: './index.ts' } },
      html: { template: './index.html' },
      server: {
        port: 3600 + Math.floor(Math.random() * 200),
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
  mkdirSync(join(fixtureRoot, 'node_modules'), { recursive: true });

  mkdirSync(leftpadRoot, { recursive: true });
  writeFileSync(
    join(leftpadRoot, 'package.json'),
    `${JSON.stringify({ name: 'leftpad', version: '1.0.0', main: 'index.js' }, null, 2)}\n`,
  );
  writeFileSync(
    join(leftpadRoot, 'index.js'),
    "module.exports = function leftpad() {\n  return 'leftpad-ok';\n};\n",
  );

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
});

afterAll(() => {
  rmSync(outputRoot, { force: true, recursive: true });
  rmSync(markerPath, { force: true });
  rmSync(leftpadRoot, { force: true, recursive: true });
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

test('type:module ESM Main/Preload real-load without require is not defined', async () => {
  rmSync(markerPath, { force: true });
  rmSync(outputRoot, { force: true, recursive: true });

  const stderrChunks: string[] = [];
  const server = await createServer({
    config: createEsmTypeModuleConfig(),
    cwd: fixtureRoot,
  });

  try {
    const child = server.electronProcess;
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderrChunks.push(String(chunk));
    });

    expect(server.urls.length).toBeGreaterThan(0);
    expect(child.pid).toBeTypeOf('number');

    await waitFor(() => existsSync(markerPath));
    const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as {
      leftpad: string;
      pid: number;
      url: string;
    };
    expect(marker.url).toBe(server.urls[0]);
    expect(marker.pid).toBe(child.pid);
    // Residual require('leftpad') resolved under ESM Main.
    expect(marker.leftpad).toBe('leftpad-ok');

    const mainBundle = readFileSync(join(outputRoot, 'main/index.mjs'), 'utf8');
    const preloadBundle = readFileSync(
      join(outputRoot, 'preload/index.mjs'),
      'utf8',
    );
    // Static import externals for electron (no bare require("electron")).
    expect(mainBundle).not.toContain('require("electron")');
    expect(preloadBundle).not.toContain('require("electron")');
    // Residual require('leftpad') routed through createRequire / node-commonjs.
    expect(mainBundle).toMatch(/createRequire|leftpad/);
    expect(preloadBundle).toMatch(/createRequire|leftpad/);

    const stderr = stderrChunks.join('');
    expect(stderr).not.toMatch(/require is not defined/i);
    expect(child.exitCode).toBeNull();
  } finally {
    await server.close();
  }
});
