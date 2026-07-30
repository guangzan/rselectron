import { afterAll, expect, test } from '@rstest/core';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { packPublicFacade } from '../helpers/pack-facade.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = mkdtempSync(join(tmpdir(), 'rselectron-tarball-'));
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const workspacePackageJson = JSON.parse(
  readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
) as {
  devDependencies: {
    '@rsbuild/core': string;
    '@types/node': string;
  };
};

afterAll(() => {
  rmSync(fixtureRoot, { force: true, recursive: true });
});

function run(
  command: string,
  args: string[],
  cwd = repositoryRoot,
): SpawnSyncReturns<string> {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    // Only .cmd/.bat need a shell; cmd.exe /c invocations must not be re-wrapped.
    shell: isWindows && /\.(cmd|bat)$/i.test(command),
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
  });
}

function expectSuccess(result: SpawnSyncReturns<string>): void {
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(
      [
        `Command failed with status ${String(result.status)}.`,
        result.error?.message,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}

function runInstalledCli(args: string[]): SpawnSyncReturns<string> {
  const executable = join(
    fixtureRoot,
    'node_modules',
    '.bin',
    isWindows ? 'rselectron.cmd' : 'rselectron',
  );

  if (isWindows) {
    return run(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', `"${executable}" ${args.join(' ')}`],
      fixtureRoot,
    );
  }

  return run(executable, args, fixtureRoot);
}

test('a consumer can install and use the packed public facade', () => {
  const tarballPath = packPublicFacade(fixtureRoot);

  writeFileSync(
    join(fixtureRoot, 'package.json'),
    JSON.stringify({ name: 'outside-consumer', private: true, type: 'module' }),
  );

  const install = run(
    npm,
    [
      'install',
      tarballPath,
      `@rsbuild/core@${workspacePackageJson.devDependencies['@rsbuild/core']}`,
      `@types/node@${workspacePackageJson.devDependencies['@types/node']}`,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--legacy-peer-deps',
    ],
    fixtureRoot,
  );
  expectSuccess(install);

  const installedPackageJson = JSON.parse(
    readFileSync(
      join(fixtureRoot, 'node_modules/@rselectron/core/package.json'),
      'utf8',
    ),
  ) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    version: string;
  };
  expect(installedPackageJson.dependencies).toBeUndefined();
  expect(installedPackageJson.peerDependencies).toEqual({
    '@rsbuild/core': '^2.0.0',
    electron: '>=41 <44',
  });

  const publicDeclaration = readFileSync(
    join(fixtureRoot, 'node_modules/@rselectron/core/dist/index.d.ts'),
    'utf8',
  );
  expect(publicDeclaration).not.toContain('@rselectron-internal');

  writeFileSync(
    join(fixtureRoot, 'index.ts'),
    "import { build, defineConfig, version } from '@rselectron/core';\nconst packageVersion: string = version;\nconst config = defineConfig({});\nvoid build;\nvoid config;\n",
  );
  const typecheck = run(
    process.execPath,
    [
      join(repositoryRoot, 'node_modules/typescript/bin/tsc'),
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--noEmit',
      '--strict',
      '--target',
      'ES2024',
      'index.ts',
    ],
    fixtureRoot,
  );
  expectSuccess(typecheck);

  const api = run(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      "import('@rselectron/core').then(({ version }) => console.log(version))",
    ],
    fixtureRoot,
  );
  expectSuccess(api);
  expect(api.stdout.trim()).toBe(installedPackageJson.version);

  const help = runInstalledCli(['--help']);
  expectSuccess(help);
  expect(help.stdout).toContain('Usage: rselectron <command> [options]');

  const version = runInstalledCli(['--version']);
  expectSuccess(version);
  expect(version.stdout.trim()).toBe(installedPackageJson.version);

  const missingCommand = runInstalledCli([]);
  expect(missingCommand.status).toBe(1);
  expect(missingCommand.stderr).toContain('No command specified.');
  expect(missingCommand.stderr).toContain(
    'Usage: rselectron <command> [options]',
  );
});
