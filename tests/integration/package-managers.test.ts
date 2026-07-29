import { afterAll, beforeAll, expect, test } from '@rstest/core';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { writeFakeElectron } from '../helpers/fake-electron.ts';
import { packPublicFacade } from '../helpers/pack-facade.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const isWindows = process.platform === 'win32';
const corepack = isWindows ? 'corepack.cmd' : 'corepack';
const npm = isWindows ? 'npm.cmd' : 'npm';
const bun = 'bun';

const workspacePackageJson = JSON.parse(
  readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
) as {
  devDependencies: {
    '@rsbuild/core': string;
  };
};

const packRoot = mkdtempSync(join(tmpdir(), 'rselectron-pack-'));
const consumerRoots: string[] = [];
let tarballPath = '';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

function run(
  command: string,
  args: string[],
  cwd: string,
): SpawnSyncReturns<string> {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      NO_COLOR: '1',
      // Allow Corepack Yarn/pnpm outside the repository packageManager pin.
      COREPACK_ENABLE_AUTO_PIN: '0',
    },
  });
}

function expectSuccess(result: SpawnSyncReturns<string>, label: string): void {
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(
      [
        `${label} failed with status ${String(result.status)}.`,
        result.error?.message,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}

function commandAvailable(command: string, args: string[]): boolean {
  const result = run(command, args, tmpdir());
  return result.error === undefined && result.status === 0;
}

const managerAvailability: Record<PackageManager, boolean> = {
  bun: commandAvailable(bun, ['--version']),
  npm: commandAvailable(npm, ['--version']),
  pnpm: commandAvailable(corepack, ['pnpm', '--version']),
  yarn: commandAvailable(corepack, ['yarn', '--version']),
};

function createConsumerRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-pm-${name}-`));
  consumerRoots.push(root);
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        name: `rselectron-${name}-consumer`,
        private: true,
        type: 'module',
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

function installWith(
  manager: PackageManager,
  consumerRoot: string,
): SpawnSyncReturns<string> {
  const rsbuild = `@rsbuild/core@${workspacePackageJson.devDependencies['@rsbuild/core']}`;
  switch (manager) {
    case 'npm':
      return run(
        npm,
        [
          'install',
          tarballPath,
          rsbuild,
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          '--legacy-peer-deps',
        ],
        consumerRoot,
      );
    case 'pnpm':
      return run(
        corepack,
        ['pnpm', 'add', tarballPath, rsbuild, '--ignore-scripts'],
        consumerRoot,
      );
    case 'yarn': {
      writeFileSync(
        join(consumerRoot, '.yarnrc.yml'),
        'nodeLinker: node-modules\n',
      );
      return run(
        corepack,
        ['yarn', 'add', `rselectron@file:${tarballPath}`, rsbuild],
        consumerRoot,
      );
    }
    case 'bun':
      return run(bun, ['add', tarballPath, rsbuild], consumerRoot);
  }
}

function installedBin(consumerRoot: string): string {
  return join(
    consumerRoot,
    'node_modules',
    '.bin',
    isWindows ? 'rselectron.cmd' : 'rselectron',
  );
}

function runInstalledCli(
  consumerRoot: string,
  args: string[],
): SpawnSyncReturns<string> {
  const executable = installedBin(consumerRoot);
  if (isWindows) {
    return run(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', `"${executable}" ${args.join(' ')}`],
      consumerRoot,
    );
  }
  return run(executable, args, consumerRoot);
}

function writeMinimalMainApp(consumerRoot: string): void {
  mkdirSync(join(consumerRoot, 'main'), { recursive: true });
  writeFileSync(
    join(consumerRoot, 'main/index.ts'),
    "console.log('consumer-main');\n",
  );
}

beforeAll(() => {
  tarballPath = packPublicFacade(packRoot);
});

afterAll(() => {
  rmSync(packRoot, { force: true, recursive: true });
  for (const root of consumerRoots) {
    rmSync(root, { force: true, recursive: true });
  }
});

test('packed public facade ships documented package surface without private refs', () => {
  const listing = run('tar', ['-tzf', tarballPath], packRoot);
  expectSuccess(listing, 'tar list');
  const files = listing.stdout.split('\n').filter(Boolean);

  expect(files).toEqual(
    expect.arrayContaining([
      'package/bin/rselectron.js',
      'package/dist/index.js',
      'package/dist/index.d.ts',
      'package/node.d.ts',
      'package/package.json',
      'package/LICENSE',
    ]),
  );
  expect(files.some((file) => file.includes('packages/core'))).toBe(false);
  expect(files.some((file) => file.includes('@rselectron-internal'))).toBe(
    false,
  );

  const extractRoot = mkdtempSync(join(tmpdir(), 'rselectron-extract-'));
  consumerRoots.push(extractRoot);
  expectSuccess(
    run('tar', ['-xzf', tarballPath, '-C', extractRoot], packRoot),
    'tar extract',
  );

  const packageJson = JSON.parse(
    readFileSync(join(extractRoot, 'package/package.json'), 'utf8'),
  ) as {
    bin?: Record<string, string>;
    exports?: Record<string, unknown>;
    license?: string;
    peerDependencies?: Record<string, string>;
  };

  expect(packageJson.license).toBe('MIT');
  expect(packageJson.bin?.rselectron).toBe('./bin/rselectron.js');
  expect(packageJson.exports).toMatchObject({
    '.': expect.objectContaining({
      import: './dist/index.js',
      types: './dist/index.d.ts',
    }),
    './node': expect.objectContaining({
      types: './node.d.ts',
    }),
  });
  expect(packageJson.peerDependencies).toEqual({
    '@rsbuild/core': '^2.0.0',
    electron: '>=41 <44',
  });

  const js = readFileSync(join(extractRoot, 'package/dist/index.js'), 'utf8');
  const dts = readFileSync(
    join(extractRoot, 'package/dist/index.d.ts'),
    'utf8',
  );
  const nodeTypes = readFileSync(
    join(extractRoot, 'package/node.d.ts'),
    'utf8',
  );
  expect(js).not.toContain('@rselectron-internal');
  expect(js).not.toContain('packages/core');
  expect(dts).not.toContain('@rselectron-internal');
  expect(dts).not.toContain('packages/core');
  expect(nodeTypes).toContain('RSELECTRON_RENDERER_URL');
  expect(existsSync(join(extractRoot, 'package/LICENSE'))).toBe(true);
});

for (const manager of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
  test.skipIf(!managerAvailability[manager])(
    `${manager} consumer installs the facade, resolves Electron, and cleans up idempotently`,
    async () => {
      if (!managerAvailability[manager]) {
        throw new Error(`${manager} unavailable`);
      }

      const consumerRoot = createConsumerRoot(manager);
      const install = installWith(manager, consumerRoot);
      expectSuccess(install, `${manager} install`);

      expect(existsSync(join(consumerRoot, 'node_modules/rselectron'))).toBe(
        true,
      );
      expect(existsSync(installedBin(consumerRoot))).toBe(true);
      expect(
        existsSync(join(consumerRoot, 'node_modules/rselectron/node.d.ts')),
      ).toBe(true);

      const help = runInstalledCli(consumerRoot, ['--help']);
      expectSuccess(help, `${manager} --help`);
      expect(help.stdout).toContain('Usage: rselectron <command> [options]');

      const version = runInstalledCli(consumerRoot, ['--version']);
      expectSuccess(version, `${manager} --version`);
      expect(version.stdout.trim().length).toBeGreaterThan(0);

      const missingCommand = runInstalledCli(consumerRoot, []);
      if (missingCommand.status !== 1) {
        throw new Error(
          [
            `${manager} empty-args CLI expected status 1, got ${String(missingCommand.status)}.`,
            `error=${String(missingCommand.error)}`,
            `stdout=${missingCommand.stdout}`,
            `stderr=${missingCommand.stderr}`,
            `bin=${installedBin(consumerRoot)}`,
          ].join('\n'),
        );
      }
      expect(missingCommand.stderr).toContain('No command specified.');
      expect(missingCommand.stderr).toContain(
        'Usage: rselectron <command> [options]',
      );

      const api = run(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          "import('rselectron').then(({ version }) => console.log(version))",
        ],
        consumerRoot,
      );
      expectSuccess(api, `${manager} api import`);
      expect(api.stdout.trim()).toBe(version.stdout.trim());

      writeMinimalMainApp(consumerRoot);
      writeFakeElectron({ appRoot: consumerRoot, version: '43.2.0' });

      const resolveElectron = run(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          "import('rselectron').then(({ resolveProjectElectron }) => { const electron = resolveProjectElectron(process.cwd()); console.log(JSON.stringify({ major: electron.major, version: electron.version })); })",
        ],
        consumerRoot,
      );
      expectSuccess(resolveElectron, `${manager} resolveProjectElectron`);
      expect(JSON.parse(resolveElectron.stdout)).toEqual({
        major: 43,
        version: '43.2.0',
      });

      const missingRoot = createConsumerRoot(`${manager}-missing-electron`);
      const missingInstall = installWith(manager, missingRoot);
      expectSuccess(missingInstall, `${manager} missing-electron install`);
      writeMinimalMainApp(missingRoot);
      writeFileSync(
        join(missingRoot, 'run-missing.mjs'),
        `import { build } from 'rselectron';
try {
  await build({
    cwd: process.cwd(),
    config: {
      main: {
        root: './main',
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: './out/main' },
          filename: { js: '[name].cjs' },
          filenameHash: false,
        },
        electron: { format: 'auto' },
      },
    },
  });
  console.log('unexpected-success');
  process.exitCode = 0;
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  console.log(String(code));
  process.exitCode = 1;
}
`,
      );
      const missing = run(
        process.execPath,
        [join(missingRoot, 'run-missing.mjs')],
        missingRoot,
      );
      expect(missing.status).not.toBe(0);
      expect(missing.stdout.trim()).toBe('RSELECTRON_ELECTRON_NOT_FOUND');

      writeFileSync(
        join(consumerRoot, 'run-build.mjs'),
        `import { build } from 'rselectron';
const result = await build({
  cwd: process.cwd(),
  config: {
    main: {
      root: './main',
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: true,
        distPath: { root: './out/main' },
        filename: { js: '[name].cjs' },
        filenameHash: false,
        target: 'node',
      },
      tools: { rspack: { externals: ['electron'] } },
      electron: { format: 'cjs' },
    },
  },
});
await result.close();
await result.close();
console.log('closed-idempotent');
`,
      );
      const buildResult = run(
        process.execPath,
        [join(consumerRoot, 'run-build.mjs')],
        consumerRoot,
      );
      expectSuccess(buildResult, `${manager} idempotent close`);
      expect(buildResult.stdout).toContain('closed-idempotent');
    },
  );
}

for (const manager of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
  if (!managerAvailability[manager]) {
    console.warn(
      `[evidence-skip] ${manager} consumer package-manager fixture unavailable on ${process.platform}/${process.arch}`,
    );
  }
}
