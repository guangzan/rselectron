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
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };

if (pkg.version !== version) {
  throw new Error(
    `Package version from tag "${version}" mismatches with the current version "${pkg.version}"`,
  );
}

console.log('Publishing version', version, 'with tag latest');

// Workflow already runs `pnpm run build`. Skip lifecycle scripts so publish
// does not re-run `prepack`. Prefer `npm publish` for GitHub OIDC trusted
// publishing; npm auto-attaches provenance for public repos.
// Every release — prereleases included — publishes to `latest`, so `npm i`
// always installs the newest available version. npm only blocks prereleases
// from an *implicit* latest tag, so `--tag latest` is passed explicitly;
// this avoids dist-tag promotion, which OIDC short-lived tokens cannot do.
const publishArgs = [
  'publish',
  '--access',
  'public',
  '--ignore-scripts',
  '--tag',
  'latest',
];

$.verbose = true;
await $({ cwd: pkgDir })`npm ${publishArgs}`;
