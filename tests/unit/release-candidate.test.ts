import { expect, test } from '@rstest/core';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { RSBUILD_TESTED_WINDOW } from '../../packages/rselectron/src/index.ts';
import { packPublicFacade } from '../helpers/pack-facade.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const facadePackageJsonPath = join(
  repositoryRoot,
  'packages/rselectron/package.json',
);
const publishWorkflowPath = join(
  repositoryRoot,
  '.github/workflows/publish.yml',
);
const releaseScriptPath = join(repositoryRoot, 'scripts/release.ts');
const publishCiScriptPath = join(repositoryRoot, 'scripts/publish-ci.ts');
const matrixPath = join(
  repositoryRoot,
  'docs/monorail/compatibility-matrix.md',
);
const deltaReviewPath = join(
  repositoryRoot,
  'docs/monorail/matrix-delta-review.md',
);

test('public facade is a 1.0 beta with MIT surface', () => {
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

  expect(packageJson.version).toMatch(/^1\.0\.0-beta\.\d+$/);
  expect(packageJson.license).toBe('MIT');
  expect(packageJson.type).toBe('module');
  expect(packageJson.engines.node).toBe('>=20.19.0');
  expect(packageJson.peerDependencies).toEqual({
    '@rsbuild/core': '^2.0.0',
    electron: '>=28 <44',
  });
  expect(packageJson.peerDependenciesMeta?.electron?.optional).toBe(true);
  expect(packageJson.exports).toHaveProperty('.');
  expect(packageJson.exports).toHaveProperty('./node');
  expect(packageJson.bin.rselectron).toBe('./bin/rselectron.js');
  expect(packageJson.publishConfig?.access).toBe('public');
  expect(existsSync(join(repositoryRoot, 'LICENSE'))).toBe(true);
  expect(
    existsSync(join(repositoryRoot, 'packages/rselectron/README.md')),
  ).toBe(true);
  expect(
    existsSync(join(repositoryRoot, 'packages/rselectron/CHANGELOG.md')),
  ).toBe(false);
});

test('rsbuild tested window stays synced with the workspace devDependency', () => {
  const rootPackageJson = JSON.parse(
    readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
  ) as { devDependencies: Record<string, string> };
  const tested = RSBUILD_TESTED_WINDOW.tested;
  expect(tested).toMatch(/^\d+\.\d+\.\d+$/);
  expect(tested).toBe(rootPackageJson.devDependencies['@rsbuild/core']);
});

test('tag publish workflow gates OIDC npm publication', () => {
  expect(existsSync(releaseScriptPath)).toBe(true);
  expect(existsSync(publishCiScriptPath)).toBe(true);
  expect(existsSync(join(repositoryRoot, '.node-version'))).toBe(true);
  expect(existsSync(join(repositoryRoot, '.changeset'))).toBe(false);

  const workflow = readFileSync(publishWorkflowPath, 'utf8');
  expect(workflow).toContain('tags:');
  expect(workflow).toContain("'v*'");
  expect(workflow).toContain('id-token: write');
  expect(workflow).toContain("github.repository == 'guangzan/rselectron'");
  expect(workflow).toContain('publish-ci');
  expect(workflow).toContain('changelogithub');
  expect(workflow).not.toContain('NPM_TOKEN');
  expect(workflow).not.toContain('changesets/action');

  // Prereleases must publish with an explicit dist-tag; OIDC cannot promote
  // latest via dist-tag add, so keep beta/alpha as the publish tag only.
  const publishCi = readFileSync(publishCiScriptPath, 'utf8');
  expect(publishCi).toContain("'--tag', releaseTag");
  expect(publishCi).not.toContain('dist-tag add');
});

test('compatibility-matrix evidence gates are not silently waived', () => {
  const matrix = readFileSync(matrixPath, 'utf8');
  expect(matrix).not.toMatch(/- Evidence \/ 证据: Pending \/ 待实现\n/);
  expect(existsSync(deltaReviewPath)).toBe(true);
  expect(readFileSync(deltaReviewPath, 'utf8')).toContain('6.0.0-beta.1');
});

test('packed beta tarball includes LICENSE and has no telemetry hooks', () => {
  const packRoot = mkdtempSync(join(tmpdir(), 'rselectron-beta-pack-'));
  try {
    const tarballPath = packPublicFacade(packRoot);
    const list = spawnSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' });
    expect(list.status).toBe(0);
    expect(list.stdout).toContain('package/LICENSE');
    expect(list.stdout).toContain('package/README.md');
    expect(list.stdout).toContain('package/package.json');
    expect(list.stdout).toContain('package/dist/index.js');

    spawnSync('tar', ['-xzf', tarballPath, '-C', packRoot], {
      encoding: 'utf8',
    });
    const extracted = join(packRoot, 'package');
    const packageJson = JSON.parse(
      readFileSync(join(extracted, 'package.json'), 'utf8'),
    ) as { version: string };
    expect(packageJson.version).toMatch(/^1\.0\.0-beta\.\d+$/);

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

test('English and Simplified Chinese docs stay consistent for the beta', () => {
  const readmeEn = readFileSync(join(repositoryRoot, 'README.md'), 'utf8');
  const readmeZh = readFileSync(join(repositoryRoot, 'README.zh.md'), 'utf8');
  const packageReadme = readFileSync(
    join(repositoryRoot, 'packages/rselectron/README.md'),
    'utf8',
  );
  expect(readmeEn).toContain('./README.zh.md');
  expect(readmeZh).toContain('./README.md');
  expect(readmeEn).toContain('https://guangzan.github.io/rselectron/');
  expect(readmeZh).toContain('https://guangzan.github.io/rselectron/zh/');
  expect(packageReadme).toContain(
    'https://guangzan.github.io/rselectron/rselectron-banner.png',
  );
  expect(packageReadme).toContain('npm i @rselectron/core -D');
  expect(packageReadme).toContain('https://guangzan.github.io/rselectron/');

  const enCompatibility = readFileSync(
    join(repositoryRoot, 'website/docs/en/guide/compatibility.md'),
    'utf8',
  );
  const zhCompatibility = readFileSync(
    join(repositoryRoot, 'website/docs/zh/guide/compatibility.md'),
    'utf8',
  );
  expect(enCompatibility).toContain('28–43');
  expect(zhCompatibility).toContain('28–43');
  expect(existsSync(join(repositoryRoot, 'docs/monorail/CONTEXT.md'))).toBe(
    true,
  );
  expect(existsSync(join(repositoryRoot, 'docs/monorail/CONTEXT.zh.md'))).toBe(
    true,
  );
});
