#!/usr/bin/env zx

import { versionBump } from 'bumpp';
import { $ } from 'zx';

try {
  const packages = ['packages/rselectron/package.json'];

  console.log('Bumping versions in packages:', packages.join(', '), '\n');

  const result = await versionBump({
    files: packages,
    commit: true,
    push: true,
    tag: true,
  });

  const isPrerelease =
    result.newVersion.includes('beta') || result.newVersion.includes('alpha');

  if (!isPrerelease) {
    console.log('Pushing to release branch');
    await $`git update-ref refs/heads/release refs/heads/main`;
    await $`git push origin release`;
  }
} catch (err) {
  console.error(err);
}
