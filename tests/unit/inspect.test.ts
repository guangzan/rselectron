import { afterAll, expect, test } from '@rstest/core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspect } from '../../packages/rselectron/src/index.ts';
import { runCli } from '../../packages/cli/src/index.ts';

const roots: string[] = [];

function createRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-inspect-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

test('inspect resolves three config layers per Role without building', async () => {
  const appRoot = createRoot('layers');
  writeFileSync(join(appRoot, 'main.ts'), "console.log('inspect-main');\n");

  const result = await inspect({
    cwd: appRoot,
    config: {
      main: {
        root: appRoot,
        source: { entry: { index: './main.ts' } },
        output: {
          module: false,
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
      renderer: {
        root: appRoot,
        source: { entry: { index: './main.ts' } },
        output: {
          target: 'web',
        },
      },
    },
  });

  expect(Object.keys(result.roles).sort()).toEqual(['main', 'renderer']);
  expect(result.roles.main?.normalized.electron?.format).toBe('cjs');
  expect(result.roles.main?.rsbuild).toBeTypeOf('object');
  expect(result.roles.main?.rspack.length).toBeGreaterThan(0);
  expect(result.roles.renderer?.rspack.length).toBeGreaterThan(0);
  expect(result.warnings).toEqual([
    {
      code: 'RSELECTRON_ROLE_MISSING',
      message: 'No preload Role is configured; skipping it.',
      role: 'preload',
    },
  ]);
});

test('inspect redacts sensitive environment-derived values in both views', async () => {
  const appRoot = createRoot('redact');
  writeFileSync(
    join(appRoot, '.env.production'),
    [
      'RSELECTRON_API_TOKEN=super-secret-token',
      'RSELECTRON_PUBLIC_NAME=visible',
    ].join('\n'),
  );
  writeFileSync(
    join(appRoot, 'main.ts'),
    'console.log(process.env.RSELECTRON_API_TOKEN);\n',
  );

  const result = await inspect({
    cwd: appRoot,
    envMode: 'production',
    config: {
      main: {
        root: appRoot,
        source: { entry: { index: './main.ts' } },
        output: { module: false, target: 'node' },
        electron: { format: 'cjs' },
      },
    },
  });

  const serialized = JSON.stringify(result.roles);
  expect(serialized).not.toContain('super-secret-token');
  expect(serialized).toContain('[REDACTED]');
  expect(serialized).toContain('visible');

  expect(result.format('human')).toContain('[REDACTED]');
  expect(result.format('human')).not.toContain('super-secret-token');
  expect(result.format('json')).toContain('[REDACTED]');
  expect(result.format('json')).not.toContain('super-secret-token');
});

test('inspect surfaces structured configuration failures', async () => {
  await expect(
    inspect({
      config: async () => {
        throw new Error('config boom');
      },
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_CONFIG_LOAD_FAILED',
    role: 'orchestration',
  });
});

test('inspect CLI projects the same data model and structured errors', async () => {
  const appRoot = createRoot('cli');
  writeFileSync(join(appRoot, 'main.ts'), "console.log('cli-inspect');\n");
  writeFileSync(
    join(appRoot, 'rselectron.config.mjs'),
    `export default {
  main: {
    root: ${JSON.stringify(appRoot)},
    source: { entry: { index: './main.ts' } },
    output: { module: false, target: 'node' },
    electron: { format: 'cjs' },
  },
};
`,
  );

  const stdout: string[] = [];
  const stderr: string[] = [];
  const status = await runCli(
    [
      'inspect',
      '--config',
      join(appRoot, 'rselectron.config.mjs'),
      '--config-loader',
      'native',
    ],
    {
      stdout: (message) => {
        stdout.push(message);
      },
      stderr: (message) => {
        stderr.push(message);
      },
    },
  );

  expect(stderr.join('')).toContain('RSELECTRON_ROLE_MISSING');
  expect(status, stderr.join('') + stdout.join('')).toBe(0);
  const payload = JSON.parse(stdout.join('')) as {
    roles: { main: { rsbuild: unknown; rspack: unknown[] } };
  };
  expect(payload.roles.main.rsbuild).toBeDefined();
  expect(payload.roles.main.rspack).toBeDefined();

  const failedStderr: string[] = [];
  const failedStatus = await runCli(['inspect', '--unknown-flag'], {
    stdout: () => undefined,
    stderr: (message) => {
      failedStderr.push(message);
    },
  });
  expect(failedStatus).toBe(1);
  expect(failedStderr.join('')).toContain('[RSELECTRON_CLI_OPTION_UNKNOWN]');
});
