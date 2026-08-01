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

  const publishWorkflow = readFileSync(
    join(repositoryRoot, '.github/workflows/publish.yml'),
    'utf8',
  );
  expect(publishWorkflow).toContain('id-token: write');
  expect(publishWorkflow).toContain('publish-ci');
  expect(publishWorkflow).toContain('changelogithub');
  expect(workflow).toContain('node-version-file: .node-version');
  expect(workflow).toContain('pnpm/action-setup');

  // Slim matrix (14da156): PR = ubuntu×43; main = ubuntu×43 + ubuntu×41 + windows×43 + macos-latest×43.
  for (const runner of ['ubuntu-latest', 'windows-latest', 'macos-latest']) {
    expect(workflow).toContain(runner);
  }
  expect(workflow).not.toContain('macos-13');
  expect(workflow).not.toContain('ubuntu-24.04-arm');

  // Versions live inside the fromJSON matrix blob: "electron":"41.0.0"
  expect(workflow).toMatch(/"electron"\s*:\s*"41\./);
  expect(workflow).toMatch(/"electron"\s*:\s*"43\./);

  expect(workflow).toContain('upload-artifact');
  expect(workflow).toContain('actions/upload-artifact');
  expect(workflow.toLowerCase()).toContain('xvfb');
  expect(workflow).toContain('node_modules/electron/install.js');

  const workspace = readFileSync(
    join(repositoryRoot, 'pnpm-workspace.yaml'),
    'utf8',
  );
  expect(workspace).toMatch(/allowBuilds:[\s\S]*electron:\s*true/);
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
  expect(workflow).toMatch(/"electron"\s*:\s*"41\./);
  expect(workflow).toMatch(/"electron"\s*:\s*"43\./);
  expect(workflow).not.toMatch(/"electron"\s*:\s*"40\./);
  expect(workflow).not.toMatch(/"electron"\s*:\s*"44\./);
});

test('docs deploy workflow publishes website/doc_build to GitHub Pages', () => {
  const deployWorkflowPath = join(
    repositoryRoot,
    '.github/workflows/deploy-docs.yml',
  );
  expect(existsSync(deployWorkflowPath)).toBe(true);

  const workflow = readFileSync(deployWorkflowPath, 'utf8');
  expect(workflow).toContain("github.repository == 'guangzan/rselectron'");
  expect(workflow).toContain('pages: write');
  expect(workflow).toContain('id-token: write');
  expect(workflow).toContain('docs:build');
  expect(workflow).toContain('website/doc_build');
  expect(workflow).toContain('actions/upload-pages-artifact');
  expect(workflow).toContain('actions/deploy-pages');
  expect(workflow).toContain('node-version-file: .node-version');
  expect(workflow).toContain('pnpm/action-setup');
  expect(workflow).toMatch(/branches:\s*\n\s*-\s*main/);
  expect(workflow).toContain('workflow_dispatch');
});
