import { afterAll, expect, test } from '@rstest/core';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  build,
  defineConfig,
  type ConfigContext,
} from '../../packages/rselectron/src/index.ts';
import { runCli } from '../../packages/cli/src/index.ts';
import vanillaConfig, {
  closedRoles,
} from '../fixtures/vanilla-three-role/rselectron.config.ts';

const fixtureRoot = resolve(
  import.meta.dirname,
  '../fixtures/vanilla-three-role',
);
const outputRoot = join(fixtureRoot, 'out');

afterAll(() => {
  rmSync(outputRoot, { force: true, recursive: true });
});

test('build compiles three configured Roles into runnable outputs', async () => {
  const result = await build({
    config: vanillaConfig,
    cwd: fixtureRoot,
  });

  expect(Object.keys(result.roles).sort()).toEqual([
    'main',
    'preload',
    'renderer',
  ]);

  const mainEntry = join(outputRoot, 'main/index.cjs');
  const preloadEntry = join(outputRoot, 'preload/index.mjs');
  const rendererEntry = join(outputRoot, 'renderer/index.html');

  expect(result.roles.main?.paths).toContain(mainEntry);
  expect(result.roles.preload?.paths).toContain(preloadEntry);
  expect(result.roles.renderer?.paths).toContain(rendererEntry);
  expect(result.roles.main?.stats).toBeDefined();
  expect(result.roles.preload?.stats).toBeDefined();
  expect(result.roles.renderer?.stats).toBeDefined();
  expect(existsSync(mainEntry)).toBe(true);
  expect(existsSync(preloadEntry)).toBe(true);
  expect(readFileSync(rendererEntry, 'utf8')).toContain(
    'Rselectron Vanilla Fixture',
  );

  const mainRun = spawnSync(process.execPath, [mainEntry], {
    encoding: 'utf8',
  });
  expect(mainRun.status).toBe(0);
  expect(mainRun.stdout.trim()).toBe('main-ready');

  const preloadRun = spawnSync(process.execPath, [preloadEntry], {
    encoding: 'utf8',
  });
  expect(preloadRun.status).toBe(0);
  expect(preloadRun.stdout.trim()).toBe('preload-ready');

  await result.close();
  expect([...closedRoles].sort()).toEqual(['main', 'preload', 'renderer']);
  await result.close();
  expect([...closedRoles].sort()).toEqual(['main', 'preload', 'renderer']);
});

test('build warns for a missing optional Role and builds the others', async () => {
  const result = await build({
    config: {
      main: {
        ...vanillaConfig.main,
        plugins: [],
      },
      renderer: {
        ...vanillaConfig.renderer,
        plugins: [],
      },
    },
    cwd: fixtureRoot,
  });

  expect(result.warnings).toEqual([
    {
      code: 'RSELECTRON_ROLE_MISSING',
      message: 'No preload Role is configured; skipping it.',
      role: 'preload',
    },
  ]);
  expect(Object.keys(result.roles).sort()).toEqual(['main', 'renderer']);
  expect(existsSync(join(outputRoot, 'main/index.cjs'))).toBe(true);
  expect(existsSync(join(outputRoot, 'renderer/index.html'))).toBe(true);

  await result.close();
});

test('build rejects watch mode before creating Role builds', async () => {
  await expect(
    build({
      config: vanillaConfig,
      cwd: fixtureRoot,
      watch: true,
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_BUILD_WATCH_UNSUPPORTED',
    role: 'orchestration',
  });
});

test('defineConfig receives the documented build context', async () => {
  let receivedContext: ConfigContext | undefined;
  const result = await build({
    config: defineConfig(async (context) => {
      receivedContext = context;
      return {};
    }),
    envMode: 'staging',
    mode: 'none',
  });

  expect(receivedContext).toEqual({
    command: 'build',
    envMode: 'staging',
    mode: 'none',
  });
  expect(result.warnings).toHaveLength(3);
  await result.close();
});

test('a Role build failure preserves the failing Role', async () => {
  await expect(
    build({
      config: {
        main: {
          root: join(fixtureRoot, 'main'),
          source: {
            entry: {
              index: './missing.ts',
            },
          },
          output: {
            module: false,
            target: 'node',
          },
          electron: {
            format: 'cjs',
          },
        },
      },
      cwd: fixtureRoot,
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_ROLE_BUILD_FAILED',
    role: 'main',
  });
});

test('the build CLI delegates to the finite programmatic operation', async () => {
  const previousCwd = process.cwd();
  process.chdir(fixtureRoot);

  try {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const status = await runCli(
      [
        'build',
        '--config',
        'rselectron.config.ts',
        '--config-loader',
        'native',
      ],
      {
        stderr: (message) => {
          stderr.push(message);
        },
        stdout: (message) => {
          stdout.push(message);
        },
      },
    );

    expect(status).toBe(0);
    expect(stdout.join('')).toContain('Built main');
    expect(stdout.join('')).toContain('Built preload');
    expect(stdout.join('')).toContain('Built renderer');
    expect(existsSync(join(outputRoot, 'main/index.cjs'))).toBe(true);
    expect(existsSync(join(outputRoot, 'preload/index.mjs'))).toBe(true);
    expect(existsSync(join(outputRoot, 'renderer/index.html'))).toBe(true);

    const watchedStderr: string[] = [];
    const watchedStatus = await runCli(['build', '--watch'], {
      stderr: (message) => {
        watchedStderr.push(message);
      },
      stdout: () => undefined,
    });
    expect(watchedStatus).toBe(1);
    expect(watchedStderr.join('')).toContain(
      '[RSELECTRON_BUILD_WATCH_UNSUPPORTED]',
    );
  } finally {
    process.chdir(previousCwd);
  }
});
