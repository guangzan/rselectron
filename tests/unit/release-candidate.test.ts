import { expect, test } from '@rstest/core';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { packPublicFacade } from '../helpers/pack-facade.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const facadePackageJsonPath = join(
  repositoryRoot,
  'packages/rselectron/package.json',
);
const changelogPath = join(repositoryRoot, 'packages/rselectron/CHANGELOG.md');
const releaseWorkflowPath = join(
  repositoryRoot,
  '.github/workflows/release.yml',
);
const changesetConfigPath = join(repositoryRoot, '.changeset/config.json');
const matrixPath = join(repositoryRoot, 'docs/monorail/compatibility-matrix.md');
const deltaReviewPath = join(
  repositoryRoot,
  'docs/monorail/matrix-delta-review.md',
);

test('public facade is a 1.0 release candidate with MIT surface', () => {
  const packageJson = JSON.parse(
    readFileSync(facadePackageJsonPath, 'utf8'),
  ) as {
    version: string;
    license: string;
    type: string;
    engines: { node: string };
    peerDependencies: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    exports: Record<string, unknown>;
    bin: Record<string, string>;
    publishConfig?: { access?: string; provenance?: boolean };
  };

  expect(packageJson.version).toMatch(/^1\.0\.0-rc\.\d+$/);
  expect(packageJson.license).toBe('MIT');
  expect(packageJson.type).toBe('module');
  expect(packageJson.engines.node).toBe('>=20.19.0');
  expect(packageJson.peerDependencies).toEqual({
    '@rsbuild/core': '^2.0.0',
    electron: '>=41 <44',
  });
  expect(packageJson.peerDependenciesMeta?.electron?.optional).toBe(true);
  expect(packageJson.exports).toHaveProperty('.');
  expect(packageJson.exports).toHaveProperty('./node');
  expect(packageJson.bin.rselectron).toBe('./bin/rselectron.js');
  expect(packageJson.publishConfig?.access).toBe('public');
  expect(existsSync(join(repositoryRoot, 'LICENSE'))).toBe(true);
  expect(existsSync(changelogPath)).toBe(true);
  expect(readFileSync(changelogPath, 'utf8')).toContain(packageJson.version);
});

test('Changesets and release workflow gate npm provenance publication', () => {
  expect(existsSync(changesetConfigPath)).toBe(true);
  const config = JSON.parse(readFileSync(changesetConfigPath, 'utf8')) as {
    access: string;
    ignore: string[];
  };
  expect(config.access).toBe('public');
  expect(config.ignore).toEqual(
    expect.arrayContaining([
      '@rselectron-internal/cli',
      '@rselectron-internal/core',
      '@rselectron/website',
    ]),
  );

  const workflow = readFileSync(releaseWorkflowPath, 'utf8');
  expect(workflow).toContain('changesets/action');
  expect(workflow).toContain('id-token: write');
  expect(workflow).toContain('NPM_CONFIG_PROVENANCE');
  expect(workflow).toContain('release:publish');
});

test('compatibility-matrix evidence gates are not silently waived', () => {
  const matrix = readFileSync(matrixPath, 'utf8');
  expect(matrix).not.toMatch(/- Evidence \/ 证据: Pending \/ 待实现\n/);
  expect(existsSync(deltaReviewPath)).toBe(true);
  expect(readFileSync(deltaReviewPath, 'utf8')).toContain('6.0.0-beta.1');
});

test('packed RC tarball includes LICENSE and has no telemetry hooks', () => {
  const packRoot = mkdtempSync(join(tmpdir(), 'rselectron-rc-pack-'));
  try {
    const tarballPath = packPublicFacade(packRoot);
    const list = spawnSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' });
    expect(list.status).toBe(0);
    expect(list.stdout).toContain('package/LICENSE');
    expect(list.stdout).toContain('package/package.json');
    expect(list.stdout).toContain('package/dist/index.js');

    spawnSync('tar', ['-xzf', tarballPath, '-C', packRoot], {
      encoding: 'utf8',
    });
    const extracted = join(packRoot, 'package');
    const packageJson = JSON.parse(
      readFileSync(join(extracted, 'package.json'), 'utf8'),
    ) as { version: string };
    expect(packageJson.version).toMatch(/^1\.0\.0-rc\.\d+$/);

    const distIndex = readFileSync(join(extracted, 'dist/index.js'), 'utf8');
    const distCli = readFileSync(join(extracted, 'dist/cli.js'), 'utf8');
    const bundled = readFileSync(join(extracted, 'dist/43.js'), 'utf8');
    for (const source of [distIndex, distCli, bundled]) {
      expect(source.toLowerCase()).not.toContain('telemetry');
      expect(source).not.toMatch(/https:\/\/[^"'`\s]*analytics/i);
      expect(source).not.toMatch(/posthog|sentry\.io|amplitude\.com/i);
    }
  } finally {
    rmSync(packRoot, { force: true, recursive: true });
  }
});

test('English and Simplified Chinese docs stay version-consistent for the RC', () => {
  const packageJson = JSON.parse(
    readFileSync(facadePackageJsonPath, 'utf8'),
  ) as {
    version: string;
  };
  const readmeEn = readFileSync(join(repositoryRoot, 'README.md'), 'utf8');
  const readmeZh = readFileSync(join(repositoryRoot, 'README.zh.md'), 'utf8');
  expect(readmeEn).toContain(packageJson.version);
  expect(readmeZh).toContain(packageJson.version);

  const enCompatibility = readFileSync(
    join(repositoryRoot, 'website/docs/en/guide/compatibility.md'),
    'utf8',
  );
  const zhCompatibility = readFileSync(
    join(repositoryRoot, 'website/docs/zh/guide/compatibility.md'),
    'utf8',
  );
  expect(enCompatibility).toContain('41–43');
  expect(zhCompatibility).toContain('41–43');
  expect(existsSync(join(repositoryRoot, 'docs/monorail/CONTEXT.md'))).toBe(
    true,
  );
  expect(existsSync(join(repositoryRoot, 'docs/monorail/CONTEXT.zh.md'))).toBe(
    true,
  );
});
