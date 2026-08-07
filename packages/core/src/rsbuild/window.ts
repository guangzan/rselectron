import { createRequire } from 'node:module';
import type { Diagnostic } from '../types.ts';

/**
 * Frozen Rsbuild tested window for this Rselectron release: the
 * `@rsbuild/core` version pinned in the workspace devDependency set. The
 * window itself is the minor line of `tested` (e.g. `2.1.7` →
 * `>=2.1.0 <2.2.0`) and is derived wherever it is shown; it is never stored
 * separately. Patch-level updates within the tested minor line are presumed
 * safe and produce no diagnostic. Update `tested` in the same release chore
 * that bumps the devDependency; `tests/unit/release-candidate.test.ts`
 * asserts the sync.
 */
export const RSBUILD_TESTED_WINDOW: { tested: string } = {
  tested: '2.1.7',
};

interface MinorLine {
  major: number;
  minor: number;
}

function minorLine(version: string): MinorLine | undefined {
  const [major, minor] = version.split('.');
  const majorNumber = Number.parseInt(major ?? '', 10);
  const minorNumber = Number.parseInt(minor ?? '', 10);
  if (
    !Number.isFinite(majorNumber) ||
    !Number.isFinite(minorNumber) ||
    version.includes('-')
  ) {
    return undefined;
  }
  return { major: majorNumber, minor: minorNumber };
}

export function isWithinTestedWindow(
  resolvedVersion: string,
  tested: string,
): boolean {
  const resolved = minorLine(resolvedVersion);
  const testedLine = minorLine(tested);
  if (resolved === undefined || testedLine === undefined) {
    return false;
  }
  return (
    resolved.major === testedLine.major && resolved.minor === testedLine.minor
  );
}

function testedWindowRange(): string {
  const testedLine = minorLine(RSBUILD_TESTED_WINDOW.tested);
  if (testedLine === undefined) {
    throw new Error(
      `Malformed RSBUILD_TESTED_WINDOW.tested: ${RSBUILD_TESTED_WINDOW.tested}`,
    );
  }
  return `>=${testedLine.major}.${testedLine.minor}.0 <${testedLine.major}.${testedLine.minor + 1}.0`;
}

export function createRsbuildWindowWarning(
  resolvedVersion: string,
): Diagnostic {
  return {
    code: 'RSELECTRON_RSBUILD_UNTESTED',
    message: `@rsbuild/core ${resolvedVersion} is outside the tested window (${testedWindowRange()}) of this Rselectron release.`,
  };
}

/**
 * Resolves the project-local `@rsbuild/core` — under the peer model, the same
 * copy Rselectron's static imports use — and reports a warn-only diagnostic
 * when its version is outside the frozen tested window. A resolution failure
 * is skipped silently: a missing peer would already have failed the static
 * `@rsbuild/core` import, so this is not a secondary error path.
 */
export function checkRsbuildWindow(): Diagnostic | undefined {
  const requireFromCore = createRequire(import.meta.url);
  try {
    const packageJsonPath = requireFromCore.resolve(
      '@rsbuild/core/package.json',
    );
    const version = (
      requireFromCore(packageJsonPath) as {
        version?: string;
      }
    ).version;
    if (version === undefined) {
      return undefined;
    }
    return isWithinTestedWindow(version, RSBUILD_TESTED_WINDOW.tested)
      ? undefined
      : createRsbuildWindowWarning(version);
  } catch {
    return undefined;
  }
}
