import { afterAll, expect, test } from '@rstest/core';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDevSession, runPreviewSession } from '../../packages/cli/src/index.ts';
import { normalizeRuntime } from '../../packages/core/src/electron/runtime.ts';
import { createRsbuildWindowWarning } from '../../packages/core/src/rsbuild/window.ts';
import type { Diagnostic } from '../../packages/core/src/types.ts';
import { preview } from '../../packages/rselectron/src/index.ts';
import { writeFakeElectron } from '../helpers/fake-electron.ts';

const roots: string[] = [];

function createAppRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

function captureIO(): {
  stderr: string[];
  stdout: string[];
  io: { stderr: (message: string) => void; stdout: (message: string) => void };
} {
  const stderr: string[] = [];
  const stdout: string[] = [];
  return {
    stderr,
    stdout,
    io: {
      stderr: (message) => {
        stderr.push(message);
      },
      stdout: (message) => {
        stdout.push(message);
      },
    },
  };
}

function fakeServer(warnings: Diagnostic[]): {
  closed: boolean;
  close: () => Promise<void>;
  electronProcess: ChildProcess;
  urls: string[];
  warnings: Diagnostic[];
} {
  const server: {
    closed: boolean;
    close: () => Promise<void>;
    electronProcess: ChildProcess;
    urls: string[];
    warnings: Diagnostic[];
  } = {
    closed: false,
    warnings,
    urls: ['http://localhost:3000'],
    electronProcess: new EventEmitter() as unknown as ChildProcess,
    close: () => {
      server.closed = true;
      return Promise.resolve();
    },
  };
  return server;
}

test('dev CLI session prints an untested-window warning to stderr in [CODE] format', async () => {
  const { stderr, stdout, io } = captureIO();
  const server = fakeServer([createRsbuildWindowWarning('2.2.0')]);
  const session = runDevSession(io, server);
  server.electronProcess.emit('exit', 0);
  expect(await session).toBe(0);

  expect(stderr.join('')).toBe(
    '[RSELECTRON_RSBUILD_UNTESTED] @rsbuild/core 2.2.0 is outside the tested window (>=2.1.0 <2.2.0) of this Rselectron release.\n',
  );
  expect(stdout.join('')).toContain(
    'Development session listening on http://localhost:3000',
  );
  expect(server.closed).toBe(true);
});

test('dev CLI session prints nothing new for in-window runs', async () => {
  const { stderr, stdout, io } = captureIO();
  const server = fakeServer([]);
  const session = runDevSession(io, server);
  server.electronProcess.emit('exit', 0);
  expect(await session).toBe(0);

  expect(stderr.join('')).toBe('');
  expect(stdout.join('')).toContain('Development session listening');
  expect(server.closed).toBe(true);
});

test('preview CLI session prints an untested-window warning to stderr in [CODE] format', async () => {
  const { stderr, stdout, io } = captureIO();
  const result = fakeServer([createRsbuildWindowWarning('3.1.0')]);
  const session = runPreviewSession(io, result);
  result.electronProcess.emit('exit', 0);
  expect(await session).toBe(0);

  expect(stderr.join('')).toBe(
    '[RSELECTRON_RSBUILD_UNTESTED] @rsbuild/core 3.1.0 is outside the tested window (>=2.1.0 <2.2.0) of this Rselectron release.\n',
  );
  expect(stdout.join('')).toContain('Preview session started.');
  expect(result.closed).toBe(true);
});

test('preview exposes warnings from its own normalization without printing', async () => {
  const appRoot = createAppRoot('preview-warnings');
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(join(appRoot, 'main/index.ts'), "console.log('preview-main');\n");
  const execPath = writeFakeElectron({ appRoot, version: '41.0.0' });
  chmodSync(execPath, 0o755);
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'preview-warnings-fixture',
        private: true,
        main: './out/main/index.cjs',
      },
      null,
      2,
    )}\n`,
  );
  mkdirSync(join(appRoot, 'out/main'), { recursive: true });
  writeFileSync(join(appRoot, 'out/main/index.cjs'), "console.log('built');\n");

  const result = await preview({
    cwd: appRoot,
    skipBuild: true,
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
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

  try {
    expect(result.warnings).toEqual([]);
    expect(result.electronProcess.pid).toBeTypeOf('number');
  } finally {
    await result.close();
  }
});

test('normalizeRuntime emits no untested-window warning for the workspace rsbuild', () => {
  const appRoot = createAppRoot('runtime-window');
  mkdirSync(join(appRoot, 'main'), { recursive: true });
  writeFileSync(join(appRoot, 'main/index.ts'), "console.log('main');\n");
  writeFakeElectron({ appRoot, version: '41.0.0' });

  const runtime = normalizeRuntime({
    appRoot,
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: { module: false, target: 'node' },
        electron: { format: 'cjs' },
      },
    },
  });

  expect(runtime.warnings).toEqual([]);
  expect(existsSync(join(appRoot, 'main/index.ts'))).toBe(true);
});
