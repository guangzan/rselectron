# Spec: Rsbuild stays a required project peer + warn-only tested window

## Problem Statement

`@rselectron/core` declares `@rsbuild/core: ^2.0.0` as a required peer and imports it statically. Two complaints motivated reconsidering whether Rsbuild should become a built-in (direct, exact-pinned) dependency:

- **Install friction**: applications must declare `@rsbuild/core` themselves (meaningful mainly for yarn classic / bun; npm 7+ and pnpm 8+ already auto-install required peers).
- **Version drift**: the `^2.0.0` peer admits any 2.x, while Rselectron's internals are tested against one pinned version.

A built-in was rejected (ADR 0012): `@rsbuild/plugin-react` imports `{ rspack } from '@rsbuild/core'` at runtime and the whole plugin ecosystem peers on the application's copy, so plugin-using applications would end up with two divergent Rsbuild/Rspack copies (duplicate native bindings, identity split). Bundling is not viable (native `@rspack/binding` binaries, dynamic assets). The peer stays; version drift gets a warn-only tested-window diagnostic; install friction stays a docs/examples matter.

## Solution

Keep `@rsbuild/core` as a required peer (`^2.0.0`, unchanged). Add a per-release frozen **Rsbuild tested window** — the minor line of the `@rsbuild/core` version in that release's devDependency set (e.g. tested `2.1.7` → window `>=2.1.0 <2.2.0`) — and emit a warn-only structured diagnostic when the resolved project-local `@rsbuild/core` (the same copy Rselectron imports under the peer model) falls outside it.

The check runs once per orchestration generation in `normalizeRuntime` (the single choke point already called by all four commands), so `dev`, `build`, `inspect`, and `preview` all fire it. `dev` and `preview` gain a `warnings: Diagnostic[]` channel on their result types, mirroring `BuildResult.warnings` / `InspectResult.warnings`, and the CLI prints those warnings to stderr exactly as it does for `build` / `inspect`.

## User Stories

1. As a maintainer releasing a new Rselectron version, I want the tested `@rsbuild/core` minor line frozen in release metadata and asserted against the workspace devDependency set, so that the window always reflects what CI actually tested.
2. As an application developer on a tested Rsbuild minor, I want zero extra output from Rselectron commands, so that version checks do not add noise to healthy builds.
3. As an application developer on an untested Rsbuild minor or major, I want a structured warning naming the tested window, so that I can decide whether to pin back or accept the risk without the run being blocked.
4. As a developer using `dev`, I want the warning to appear in the development session, so that drift is visible in the workflow where applications live the longest.
5. As a library consumer of `dev` / `preview` / `build` / `inspect`, I want the diagnostic in the result object's `warnings` array (not printed by the library), so that I control output.
6. As a maintainer, I want the check logic pure and unit-testable without installing fake packages, so that window logic is covered by fast unit tests.

## Implementation Decisions

- **Window constant**: new module `packages/core/src/rsbuild/window.ts` exporting `RSBUILD_TESTED_WINDOW: { tested: string }` (e.g. `{ tested: '2.1.7' }`) plus the pure predicate `isWithinTestedWindow(resolvedVersion: string, tested: string): boolean`. The window is **derived** from `tested` as its minor line (`major.minor` equality), never stored separately — one source of truth, no dual data to drift. Patch differences within the minor line are silent; prerelease versions outside the minor line are outside the window (warn), which is the conservative direction.
- **Resolution**: `checkRsbuildWindow(): Diagnostic | undefined` resolves `@rsbuild/core/package.json` via `createRequire(import.meta.url)` from Rselectron's own module location — the same copy Rselectron's static imports use (peer-linked / hoisted). Reads `version`. If resolution unexpectedly fails (peer missing would already have failed the static import), skip silently with no diagnostic rather than crash with a secondary error. No new runtime dependency: minor-line comparison is numeric parsing of `major.minor`, no `semver` package.
- **Diagnostic shape**: new code `RSELECTRON_RSBUILD_UNTESTED` in the `Diagnostic.code` union (`packages/core/src/types.ts`). Because this is a project-level (not role-level) warning, make `Diagnostic.role` **optional** — a backward-compatible widening; existing role-scoped diagnostics keep setting it. Message names the resolved version and the tested window (e.g. `@rsbuild/core 2.2.0 is outside the tested window (>=2.1.0 <2.2.0) of this Rselectron release.`).
- **Wiring**: push `checkRsbuildWindow()` result into `normalizeRuntime`'s `warnings` (`packages/core/src/electron/runtime.ts`) once per normalization. `build` / `inspect` already surface `runtime.warnings`; `preview` gains `warnings: Diagnostic[]` on `PreviewResult` (from its own `normalizeRuntime` call, so `--skip-build` still fires) and `dev` gains `warnings: Diagnostic[]` on `CreateServerResult` (dev currently discards `runtime.warnings`). CLI `dev` / `preview` handlers print the new `warnings` to stderr with the same `[CODE] message` format as `build` / `inspect` (`packages/cli/src/index.ts`).
- **Release sync**: the root workspace `devDependencies["@rsbuild/core"]` is the single authority for the tested version; a release-candidate test asserts `RSBUILD_TESTED_WINDOW.tested === devDependencies["@rsbuild/core"]` so the frozen window cannot drift from CI's actual test version. `tested` is updated in the same release chore as the dependency bump (alongside `ELECTRON_SUPPORT_SNAPSHOT` maintenance).
- **Docs**: `docs/en/guide/compatibility.md` + zh mirror and the README quick-start state the `@rsbuild/core` dependency and the tested-window warning semantics (install contract `^2.0.0` wider than verification window; warn-only, never blocks).

## Testing Decisions

- **Unit (rstest, `tests/unit/`)**: pure `isWithinTestedWindow` — same minor / same patch / different patch / different minor / different major / prerelease / malformed version. `checkRsbuildWindow` resolution path: in-repo resolution against the workspace's own `@rsbuild/core` (devDeps 2.1.7) returns `undefined` (no false positive on the repo itself).
- **Release-candidate (`tests/unit/release-candidate.test.ts`)**: `RSBUILD_TESTED_WINDOW.tested` matches root `devDependencies["@rsbuild/core"]`; the diagnostic code is present in the `Diagnostic.code` union contract; compatibility docs mention the tested window.
- **CLI/contract tests**: `tests/unit/cli.test.ts`-style coverage that `dev` / `preview` result types expose `warnings: Diagnostic[]` and the CLI prints `[RSELECTRON_RSBUILD_UNTESTED]` lines when a warning is present (inject a warning-carrying result through the existing IO seam `CliIO`).
- **Seam prior art**: the `Diagnostic` / `warnings` plumbing and `CliIO` injection already exist for build/inspect; dev/preview additions follow the identical pattern. No new test infrastructure.

## Out of Scope

- Changing the `^2.0.0` peer range (install contract stays wider than the window).
- Direct dependency or bundling of `@rsbuild/core` (rejected in ADR 0012).
- Hard-erroring on out-of-window Rsbuild versions.
- Warning on patch differences within the tested minor line.
- A scaffolder (`rselectron init`) or any other mechanical friction fix beyond docs/examples.
- Any change to the Electron support snapshot policy (ADR 0005 / 0011).

## Further Notes

- Contrast with Electron is deliberate and documented in the ADR: Electron out-of-window versions are hard errors because targets derive from per-major runtime metadata; Rsbuild out-of-window versions are warnings because the application owns its build tool and the peer model guarantees a single shared copy.
- The `role`-optional widening of `Diagnostic` is the only public type change beyond additive `warnings` fields and the new diagnostic code.
