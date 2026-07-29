import { afterAll, expect, test } from '@rstest/core';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import {
  createCandidateSnapshot,
  promoteGeneration,
  resolveGenerationLayout,
} from '../../packages/core/src/generation.ts';

const roots: string[] = [];

function createRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-gen-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

test('resolveGenerationLayout keeps staging outside the active generation', () => {
  const active = join(createRoot('layout'), 'out/main');
  const layout = resolveGenerationLayout(active);
  expect(layout.active).toBe(active);
  expect(layout.staging.startsWith(join(active, '..'))).toBe(true);
  expect(layout.staging).not.toBe(active);
  expect(layout.staging.includes('.rselectron-gen')).toBe(true);
});

test('successful promotion replaces active and removes backup', async () => {
  const root = createRoot('ok');
  const active = join(root, 'main');
  mkdirSync(active, { recursive: true });
  writeFileSync(join(active, 'index.cjs'), 'old');

  const layout = resolveGenerationLayout(active);
  mkdirSync(layout.staging, { recursive: true });
  writeFileSync(join(layout.staging, 'index.cjs'), 'new');

  const candidate = createCandidateSnapshot(layout);
  expect(existsSync(join(candidate, 'index.cjs'))).toBe(true);
  expect(readFileSync(join(candidate, 'index.cjs'), 'utf8')).toBe('new');
  // Staging is renamed into a unique candidate; recreate for the next compile.
  expect(existsSync(layout.staging)).toBe(false);

  await promoteGeneration({
    active: layout.active,
    candidate,
    role: 'main',
  });

  expect(readFileSync(join(active, 'index.cjs'), 'utf8')).toBe('new');
  expect(existsSync(candidate)).toBe(false);
  expect(existsSync(layout.backup)).toBe(false);
  expect(existsSync(layout.journal)).toBe(false);
});

test('failed validation preserves the active generation', async () => {
  const root = createRoot('invalid');
  const active = join(root, 'main');
  mkdirSync(active, { recursive: true });
  writeFileSync(join(active, 'index.cjs'), 'keep-me');

  const layout = resolveGenerationLayout(active);
  mkdirSync(layout.staging, { recursive: true });
  // Empty candidate is invalid.
  const candidate = createCandidateSnapshot(layout);

  await expect(
    promoteGeneration({
      active: layout.active,
      candidate,
      role: 'preload',
      validate: (path) => existsSync(join(path, 'index.cjs')),
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_GENERATION_PROMOTE_FAILED',
    role: 'preload',
  });

  expect(readFileSync(join(active, 'index.cjs'), 'utf8')).toBe('keep-me');
});

test('rename contention retries then rolls back and keeps active', async () => {
  const root = createRoot('retry');
  const active = join(root, 'main');
  mkdirSync(active, { recursive: true });
  writeFileSync(join(active, 'index.cjs'), 'active-v1');

  const layout = resolveGenerationLayout(active);
  mkdirSync(layout.staging, { recursive: true });
  writeFileSync(join(layout.staging, 'index.cjs'), 'active-v2');
  const candidate = createCandidateSnapshot(layout);

  let attempts = 0;
  await expect(
    promoteGeneration({
      active: layout.active,
      candidate,
      role: 'main',
      retries: 2,
      rename: (from, to) => {
        attempts += 1;
        if (basename(to) === 'backup') {
          const error = new Error('EBUSY') as NodeJS.ErrnoException;
          error.code = 'EBUSY';
          throw error;
        }
        renameSync(from, to);
      },
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_GENERATION_PROMOTE_FAILED',
    role: 'main',
  });

  expect(attempts).toBeGreaterThan(1);
  expect(readFileSync(join(active, 'index.cjs'), 'utf8')).toBe('active-v1');
  expect(existsSync(layout.backup)).toBe(false);
});

test('beforePromote runs before active is replaced', async () => {
  const root = createRoot('hook');
  const active = join(root, 'main');
  mkdirSync(active, { recursive: true });
  writeFileSync(join(active, 'index.cjs'), 'v1');

  const layout = resolveGenerationLayout(active);
  mkdirSync(layout.staging, { recursive: true });
  writeFileSync(join(layout.staging, 'index.cjs'), 'v2');
  const candidate = createCandidateSnapshot(layout);

  const seen: string[] = [];
  await promoteGeneration({
    active: layout.active,
    candidate,
    role: 'main',
    beforePromote: async () => {
      seen.push(readFileSync(join(active, 'index.cjs'), 'utf8'));
    },
  });

  expect(seen).toEqual(['v1']);
  expect(readFileSync(join(active, 'index.cjs'), 'utf8')).toBe('v2');
});
