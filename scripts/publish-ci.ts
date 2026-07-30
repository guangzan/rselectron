#!/usr/bin/env zx

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { $ } from 'zx';

let version = process.argv[2];

if (!version) {
  throw new Error('No tag specified');
}

if (version.startsWith('v')) {
  version = version.slice(1);
}

const pkgPath = fileURLToPath(
  new URL('../packages/rselectron/package.json', import.meta.url),
);
const pkgDir = fileURLToPath(
  new URL('../packages/rselectron', import.meta.url),
);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
  name: string;
  version: string;
};

if (pkg.version !== version) {
  throw new Error(
    `Package version from tag "${version}" mismatches with the current version "${pkg.version}"`,
  );
}

const releaseTag = version.includes('beta')
  ? 'beta'
  : version.includes('alpha')
    ? 'alpha'
    : undefined;

console.log(
  'Publishing version',
  version,
  'with tag',
  releaseTag || 'latest',
  releaseTag ? '(then promote latest)' : '',
);

// Workflow already runs `pnpm run build`. Skip lifecycle scripts so publish
// does not re-run `prepack`. Prefer `npm publish` for GitHub OIDC trusted
// publishing; npm auto-attaches provenance for public repos.
//
// npm refuses to publish prerelease versions onto `latest` directly, so
// prereleases use --tag beta/alpha first. The npm package page renders the
// `latest` dist-tag, so promote latest afterwards so README is not stuck.
$.verbose = true;
const publishArgs = [
  'publish',
  '--access',
  'public',
  '--ignore-scripts',
  ...(releaseTag === undefined ? [] : ['--tag', releaseTag]),
];
await $({ cwd: pkgDir })`npm ${publishArgs}`;

if (releaseTag !== undefined) {
  await $({
    cwd: pkgDir,
  })`npm dist-tag add ${pkg.name}@${version} latest`;
}
