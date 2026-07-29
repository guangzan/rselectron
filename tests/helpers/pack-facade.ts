import { spawnSync } from 'node:child_process';
import {
  closeSync,
  mkdirSync,
  openSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const lockPath = join(tmpdir(), 'rselectron-pack-facade.lock');
const isWindows = process.platform === 'win32';
const corepack = isWindows ? 'corepack.cmd' : 'corepack';

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireLock(timeoutMs = 180_000): number {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      return openSync(lockPath, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      sleepSync(50);
    }
  }
  throw new Error(`Timed out acquiring facade pack lock at ${lockPath}`);
}

/**
 * Pack the public `electron-rstack` facade once at a time.
 * Concurrent `prepack`/`rslib build` races on packages/rselectron/.rslib.
 */
export function packPublicFacade(packDestination: string): string {
  mkdirSync(packDestination, { recursive: true });
  const fd = acquireLock();
  try {
    const pack = spawnSync(
      corepack,
      [
        'pnpm',
        '--filter',
        'electron-rstack',
        'pack',
        '--pack-destination',
        packDestination,
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          NO_COLOR: '1',
        },
      },
    );
    if (pack.error !== undefined || pack.status !== 0) {
      throw new Error(
        [
          `pnpm pack failed with status ${String(pack.status)}.`,
          pack.error?.message,
          pack.stdout,
          pack.stderr,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }

    const tarball = readdirSync(packDestination).find((file) =>
      file.endsWith('.tgz'),
    );
    if (tarball === undefined) {
      throw new Error(`No tarball written to ${packDestination}`);
    }
    return join(packDestination, tarball);
  } finally {
    closeSync(fd);
    try {
      unlinkSync(lockPath);
    } catch {
      // Another waiter may have already observed unlock; ignore.
    }
  }
}
