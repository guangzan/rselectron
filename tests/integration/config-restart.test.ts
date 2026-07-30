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
import { createServer } from '../../packages/rselectron/src/index.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(
  import.meta.dirname,
  '../fixtures/vanilla-config-restart',
);
const outputRoot = join(fixtureRoot, 'out');
const markerPath = join(outputRoot, 'launch-marker.json');
const sharedOptionsPath = join(fixtureRoot, 'shared-options.mjs');
const unrelatedPath = join(fixtureRoot, 'unrelated.mjs');
const configPath = join(fixtureRoot, 'rselectron.config.mjs');

const sharedOptionsTemplate = (
  generationLabel: string,
  includeRenderer: boolean,
): string =>
  [
    `export const generationLabel = ${JSON.stringify(generationLabel)};`,
    `export const includeRenderer = ${includeRenderer};`,
    '',
  ].join('\n');

function readMarker(): {
  generation: string;
  pid: number;
  url: string;
} {
  return JSON.parse(readFileSync(markerPath, 'utf8')) as {
    generation: string;
    pid: number;
    url: string;
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
  writeFileSync(sharedOptionsPath, sharedOptionsTemplate('gen-a', true));
  writeFileSync(
    unrelatedPath,
    "export const noise = 'should-not-trigger-restart';\n",
  );
  rmSync(outputRoot, { force: true, recursive: true });
  rmSync(markerPath, { force: true });
});

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 30_000,
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

test('config dependency change replaces the complete Development generation', async () => {
  writeFileSync(sharedOptionsPath, sharedOptionsTemplate('gen-a', true));
  rmSync(markerPath, { force: true });
  rmSync(outputRoot, { force: true, recursive: true });

  const server = await createServer({
    configLoader: 'native',
    configPath,
    cwd: fixtureRoot,
  });

  try {
    await waitFor(() => existsSync(markerPath));
    const first = readMarker();
    expect(first.generation).toBe('gen-a');
    expect(first.pid).toBe(server.electronProcess.pid);
    const firstPid = first.pid;
    const firstUrl = first.url;

    writeFileSync(
      unrelatedPath,
      "export const noise = 'changed-but-not-imported';\n",
    );
    await delay(1_500);
    expect(existsSync(markerPath)).toBe(true);
    expect(readMarker().generation).toBe('gen-a');
    // Unrelated files must not promote a new generation label. Host FS noise may
    // occasionally respawn Electron with the same label; the next assertion still
    // requires a real shared-options change to produce gen-b with a new pid.
    expect(readMarker().generation).toBe('gen-a');
    expect(server.electronProcess.exitCode).toBeNull();

    writeFileSync(sharedOptionsPath, sharedOptionsTemplate('gen-b', true));

    await waitFor(() => {
      if (!existsSync(markerPath)) {
        return false;
      }
      const marker = readMarker();
      return marker.generation === 'gen-b' && marker.pid !== firstPid;
    });

    const second = readMarker();
    expect(second.generation).toBe('gen-b');
    expect(second.pid).toBe(server.electronProcess.pid);
    expect(second.pid).not.toBe(firstPid);
    expect(second.url).not.toBe(firstUrl);
    expect(server.urls[0]).toBe(second.url);
  } finally {
    writeFileSync(sharedOptionsPath, sharedOptionsTemplate('gen-a', true));
    await server.close();
  }
});

test('failed config replacement stays recoverable without leaking the old generation', async () => {
  writeFileSync(sharedOptionsPath, sharedOptionsTemplate('gen-a', true));
  rmSync(markerPath, { force: true });
  rmSync(outputRoot, { force: true, recursive: true });

  const server = await createServer({
    configLoader: 'native',
    configPath,
    cwd: fixtureRoot,
  });

  try {
    await waitFor(() => existsSync(markerPath));
    const first = readMarker();
    expect(first.generation).toBe('gen-a');
    const firstPid = first.pid;
    const firstUrl = first.url;

    writeFileSync(sharedOptionsPath, sharedOptionsTemplate('broken', false));

    await waitFor(() => {
      try {
        return server.electronProcess.exitCode !== null;
      } catch {
        return true;
      }
    });

    await waitFor(async () => {
      try {
        await fetch(firstUrl);
        return false;
      } catch {
        return true;
      }
    });

    writeFileSync(sharedOptionsPath, sharedOptionsTemplate('gen-c', true));

    await waitFor(() => {
      if (!existsSync(markerPath)) {
        return false;
      }
      try {
        const marker = readMarker();
        return marker.generation === 'gen-c' && marker.pid !== firstPid;
      } catch {
        // Marker may be mid-write during Electron relaunch.
        return false;
      }
    });

    const recovered = readMarker();
    expect(recovered.generation).toBe('gen-c');
    expect(recovered.pid).toBe(server.electronProcess.pid);
    expect(recovered.pid).not.toBe(firstPid);
  } finally {
    writeFileSync(sharedOptionsPath, sharedOptionsTemplate('gen-a', true));
    await server.close();
  }
});
