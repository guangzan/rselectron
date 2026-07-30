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
  'to latest',
  releaseTag ? `and ${releaseTag}` : '',
);

// Workflow already runs `pnpm run build`. Skip lifecycle scripts so publish
// does not re-run `prepack`. Prefer `npm publish` for GitHub OIDC trusted
// publishing; npm auto-attaches provenance for public repos.
//
// Always publish to `latest` so the npm package page (which renders latest)
// picks up README and metadata. Prerelease dist-tags are applied afterwards.
$.verbose = true;
await $({ cwd: pkgDir })`npm publish --access public --ignore-scripts`;

if (releaseTag !== undefined) {
  await $({
    cwd: pkgDir,
  })`npm dist-tag add ${pkg.name}@${version} ${releaseTag}`;
}
