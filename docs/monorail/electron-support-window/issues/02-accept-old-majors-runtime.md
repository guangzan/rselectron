# 02 — Accept old majors end-to-end in runtime derivation; refresh fixtures

Status: done
Blocked by: 01

## What to build

Prove the widened window end-to-end through Rselectron's runtime derivation using the existing fake-Electron test seams (no real Electron install needed):

- `tests/unit/electron-runtime.test.ts`:
  - `writeFakeElectron({ appRoot, version: '28.3.3' })` resolves with `major === 28` and derived Main target `['electron28-main']` (mirror the existing 41-based resolution test).
  - Unsupported bounds: `27.x` and `44.x` both fail with `RSELECTRON_ELECTRON_UNSUPPORTED` — the floor and the frozen top of the window stay hard-rejected (extend the existing unsupported-major test).
- `tests/unit/renderer-advanced.test.ts`: switch the derived-browserslist default case from fake Electron `41.0.0` to `28.0.0` and assert the default `overrideBrowserslist` is `['chrome >= 120']`; explicit `electron{N}-renderer` risk-diagnostic cases may keep any in-window major.
- Refresh incidental fixtures in `tests/unit/inspect.test.ts` (fake `41.0.0`) and `tests/unit/benchmark-report.test.ts` (`43.2.0`) to in-window versions for freshness — no assertion changes expected.

## Acceptance criteria

- [x] Fake Electron `28.3.3` resolves to major 28 and derives `electron28-main` Main target.
- [x] `27.x` and `44.x` both fail with `RSELECTRON_ELECTRON_UNSUPPORTED`.
- [x] Renderer default derivation with Electron 28 emits `chrome >= 120` and stays free of the `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK` diagnostic.
- [x] Full `tests/unit` suite passes.

## Comments

Built with TDD against the already-expanded snapshot (base commit `0a98e89`): the assertions went green directly, confirming no production code change was needed.

- `tests/unit/electron-runtime.test.ts`:
  - New test `build derives targets for the widened window floor from a project-local Electron 28` mirrors the 41-based derivation test: fake `28.3.3` resolves to `major === 28`, Main target `['electron28-main']`, Renderer target `['chrome >= 120']`, `formats.main === 'cjs'`, plus the `byMajor[28]` metadata spot-check.
  - Extended `unsupported Electron majors fail with a structured error` to loop over both `27.0.0` (below floor) and `44.0.0` (frozen top), each rejecting with `RSELECTRON_ELECTRON_UNSUPPORTED`.
- `tests/unit/renderer-advanced.test.ts`: the derived-browserslist default case (the "default Renderer web target exposes no Node process globals" test) now uses fake `28.0.0` and asserts the derived default `overrideBrowserslist` (`runtime.targets.renderer`) is `['chrome >= 120']` while staying free of `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`. Explicit `electron43-renderer` / `electron-renderer` risk-diagnostic cases kept unchanged.
- `tests/unit/inspect.test.ts` and `tests/unit/benchmark-report.test.ts` were NOT touched: their fake versions are not incidental fixtures — `inspect.test.ts`'s `41.0.0` feeds the asserted `['chrome >= 138']` derivation (a window assertion), and `benchmark-report.test.ts`'s `43.2.0` is already in-window. No production code changed (`packages/core` untouched).

Verified in the worktree: `pnpm run test:unit` (17 files, 88 tests), `pnpm run typecheck` (0 errors), `pnpm run lint` (0 errors), prettier clean on both edited test files.
