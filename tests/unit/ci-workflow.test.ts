import { expect, test } from '@rstest/core';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const workflowPath = join(repositoryRoot, '.github/workflows/ci.yml');
const packageJsonPath = join(repositoryRoot, 'package.json');
const snapshotPath = join(
  repositoryRoot,
  'packages/core/src/electron/snapshot.ts',
);

test('CI workflow documents cross-platform release evidence gates', () => {
  expect(existsSync(workflowPath)).toBe(true);
  const workflow = readFileSync(workflowPath, 'utf8');

  expect(workflow).toContain('format:check');
  expect(workflow).toContain('lint');
  expect(workflow).toContain('typecheck');
  expect(workflow).toContain('build');
  expect(workflow).toContain('docs:build');
  expect(workflow).toContain('bench');
  expect(workflow).toContain('bench:check');
  expect(workflow).toContain('test');
  expect(workflow).toContain('test:e2e');

  const releaseWorkflow = readFileSync(
    join(repositoryRoot, '.github/workflows/release.yml'),
    'utf8',
  );
  expect(releaseWorkflow).toContain('changesets/action');
  expect(releaseWorkflow).toContain('NPM_CONFIG_PROVENANCE');

  for (const runner of [
    'ubuntu-latest',
    'windows-latest',
    'macos-latest',
    'macos-13',
    'ubuntu-24.04-arm',
  ]) {
    expect(workflow).toContain(runner);
  }

  expect(workflow).toMatch(/electron:\s*['"]41\./);
  expect(workflow).toMatch(/electron:\s*['"]43\./);

  expect(workflow).toContain('upload-artifact');
  expect(workflow).toContain('actions/upload-artifact');
  expect(workflow.toLowerCase()).toContain('xvfb');
});

test('Rslint and Prettier stay exact lockfile pins in package.json', () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    devDependencies: Record<string, string>;
  };

  expect(packageJson.devDependencies.prettier).toMatch(/^\d+\.\d+\.\d+$/);
  expect(packageJson.devDependencies['@rslint/core']).toMatch(
    /^\d+\.\d+\.\d+$/,
  );
});

test('CI Electron majors match the frozen support snapshot bounds', () => {
  const snapshot = readFileSync(snapshotPath, 'utf8');
  expect(snapshot).toContain('majors: [41, 42, 43]');

  const workflow = readFileSync(workflowPath, 'utf8');
  expect(workflow).toMatch(/electron:\s*['"]41\./);
  expect(workflow).toMatch(/electron:\s*['"]43\./);
  expect(workflow).not.toMatch(/electron:\s*['"]40\./);
  expect(workflow).not.toMatch(/electron:\s*['"]44\./);
});
