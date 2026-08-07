# 01 — Rsbuild tested window core: constant, predicate, resolver, diagnostic code

- Status: done
- Blocked by: None

## What to build

The frozen tested-window metadata and the pure check logic for the `RSELECTRON_RSBUILD_UNTESTED` diagnostic, with unit coverage — no command behavior changes yet.

In `packages/core/src/rsbuild/window.ts` (new module):

- `RSBUILD_TESTED_WINDOW: { tested: string }` — the `@rsbuild/core` version pinned in this release's workspace devDependency set (today `'2.1.7'`). The window itself is **derived**, never stored separately: the minor line of `tested` (`>=2.1.0 <2.2.0` for `2.1.7`).
- `isWithinTestedWindow(resolvedVersion: string, tested: string): boolean` — pure predicate: `major.minor` equality against `tested`'s minor line. Patch differences within the minor line are `true` (silent); different minor or major, prereleases, and malformed versions are `false` (warn).
- `checkRsbuildWindow(): Diagnostic | undefined` — resolves `@rsbuild/core/package.json` via `createRequire(import.meta.url)` (Rselectron's own module location — the same peer-linked / hoisted copy the static imports use), reads `version`. Returns `undefined` when within the window; returns the diagnostic when outside; returns `undefined` (silently skips) if resolution itself fails — a missing peer would already have failed Rselectron's static import, so no secondary error path. No `semver` dependency: numeric parse of `major.minor`.

In `packages/core/src/types.ts`:

- Add `'RSELECTRON_RSBUILD_UNTESTED'` to the `Diagnostic.code` union.
- Make `Diagnostic.role` optional (`role?: Role`) — backward-compatible widening; this diagnostic is project-level, not role-scoped. Existing role-scoped diagnostics keep setting it.

Diagnostic message names the resolved version and the tested window, e.g. `@rsbuild/core 2.2.0 is outside the tested window (>=2.1.0 <2.2.0) of this Rselectron release.`

Release sync: `tests/unit/release-candidate.test.ts` gains an assertion that `RSBUILD_TESTED_WINDOW.tested` equals the root workspace `devDependencies["@rsbuild/core"]` version, so the frozen window cannot drift from what CI actually tests.

## Acceptance criteria

- [ ] `isWithinTestedWindow` unit tests (rstest, `tests/unit/`): same minor / different patch (true); different minor / different major / prerelease / malformed (false).
- [ ] `checkRsbuildWindow` resolves the workspace's own `@rsbuild/core` (devDeps 2.1.7) and returns `undefined` — no false positive on the repo itself.
- [ ] `Diagnostic.code` union includes `RSELECTRON_RSBUILD_UNTESTED`; `Diagnostic.role` is optional and existing role-scoped usages still type-check.
- [ ] Release-candidate test asserts `RSBUILD_TESTED_WINDOW.tested === devDependencies["@rsbuild/core"]` and passes.
- [ ] No public behavior change yet: `build` / `inspect` / `dev` / `preview` output is byte-identical to before this ticket.
- [ ] `pnpm test:unit` and `pnpm typecheck` pass.
