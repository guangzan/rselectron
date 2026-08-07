#!/usr/bin/env node
// Pre-commit hook (simple-git-hooks): format staged files with Prettier and
// re-stage them, so the CI `format:check` gate cannot be tripped by a commit.
// Runs on staged files only; unstaged work is never touched.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const prettierBin = resolve(
  repositoryRoot,
  'node_modules/prettier/bin/prettier.cjs',
);

function git(args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

// Exit silently when there is nothing to commit (e.g. merges without staging).
const stagedNames = git(['diff', '--cached', '--name-only']).trim();
if (stagedNames.length === 0) {
  process.exit(0);
}

const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean);

if (staged.length === 0) {
  process.exit(0);
}

if (!existsSync(prettierBin)) {
  console.error(
    'pre-commit: prettier is not installed — run `pnpm install` first.',
  );
  process.exit(1);
}

try {
  // `--ignore-unknown` keeps non-Prettier files (e.g. lockfiles) untouched.
  execFileSync(
    process.execPath,
    [prettierBin, '--write', '--ignore-unknown', ...staged],
    {
      cwd: repositoryRoot,
      stdio: 'inherit',
    },
  );
} catch {
  console.error('pre-commit: Prettier failed — commit aborted.');
  process.exit(1);
}

// Re-stage exactly the files that were staged before, now formatted.
const recheck = git(['diff', '--name-only'])
  .split('\n')
  .map((file) => file.trim())
  .filter((file) => staged.includes(file));
if (recheck.length > 0) {
  git(['add', '--', ...recheck]);
}
