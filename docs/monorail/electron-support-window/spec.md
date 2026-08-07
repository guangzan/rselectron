# Spec: Electron support window 28–43

## Problem Statement

Rselectron freezes each release to the three stable Electron majors at release time and hard-rejects any project-local Electron outside that snapshot (`RSELECTRON_ELECTRON_UNSUPPORTED`, `packages/core/src/electron/resolve.ts:47`). The current snapshot (majors 41–43, peer range `>=41 <44`) leaves applications pinned to older ESM-capable Electron majors (28–40) unusable, even though the electron-vite baseline accepts them: it declares no peer, keeps per-major Node/Chromium tables down to major 22, and rejects no version. Downward widening is safe — every major from 28 on supports ESM Main/Preload output, their Chromium majors are at or below the browserslist-rs ceiling (138), and the historical release metadata is stable — so the frozen-snapshot mechanism should keep working with a widened, documented window instead of forcing users off old runtimes.

## Solution

Widen the frozen Electron support window from 41–43 to **28–43**:

1. **Snapshot metadata** (`packages/core/src/electron/snapshot.ts`): add `byMajor` entries 28–40 (41–43 exist). Data uses each major's **first stable release** (verified against `releases.electronjs.org/releases.json`; the extraction reproduces the existing 41–43 entries exactly). All new entries `esm: true`. `majors` becomes `[28 … 43]`; `peerRange` becomes `'>=28 <44'`; update the frozen-at comment.
2. **Peer range**: `packages/rselectron/package.json` peerDependencies `electron: ">=28 <44"` (optional peer unchanged).
3. **Runtime behavior**: no code change in `resolve.ts` / `runtime.ts` / target derivation. `getSupportedMajor` and the `esm` flag already work for the new entries; majors below 28 still fail with `RSELECTRON_ELECTRON_UNSUPPORTED`; majors above 43 fail identically (top stays frozen per release). Renderer browserslist derivation `chrome >= min(M, 138)` produces exact majors for 28–36, `chrome >= 138` at 37 (Chromium 138, at the ceiling), and clamped `chrome >= 138` for 38+ — no logic change.
4. **CI matrix** (`.github/workflows/ci.yml`): main-branch matrix replaces `"electron":"41.0.0","pin":true` with `"electron":"28.3.3","pin":true` (latest maintained 28.x, verified). PR job and the other 43.2.0 legs unchanged. `node ./node_modules/electron/install.js` step already handles the pinned install.
5. **Docs and release metadata**: `website/docs/en/guide/compatibility.md` and `website/docs/zh/guide/compatibility.md` update `41–43` → `28–43` and the peer range text; `README.md` / `README.zh.md` / facade README if they mention the range (grep shows none); `docs/monorail/CONTEXT.md` + `CONTEXT.zh.md` and ADR 0005 already updated via ADR 0011 during align.

Verified during spec: **Rspack 2.1.5 accepts `electron{N}-main` target strings for all majors** (spot-checked 12/18/28/30/37/43 with a real `rspack()` compile) — no bundler-side floor blocks old majors.

## User Stories

1. As an application pinned to Electron 28–40 (e.g. 28.x for legacy native-module compatibility), I want `rselectron dev` / `build` / `preview` to accept my project-local Electron, so that I can use Rselectron without a hard unsupported-version error.
2. As an application on Electron 28–36, I want the derived Renderer compiler target to be the exact snapshot Chromium major (`chrome >= M`), so that my renderer build targets the runtime I actually ship rather than a generic `chrome >= 138`.
3. As an application on Electron 27 or older, I want a structured `RSELECTRON_ELECTRON_UNSUPPORTED` error with a clear message, so that I know exactly why my runtime is rejected and what the supported window is.
4. As a maintainer, I want CI to exercise the floor (28.x) and top (43.x) majors, so that "supported" means actually run, not merely declared.
5. As a consumer of the published package, I want the optional peer range to match the documented support window (`>=28 <44`), so that package managers and docs agree with what Rselectron accepts.

## Implementation Decisions

- **Data table for `ELECTRON_SUPPORT_SNAPSHOT.byMajor`** (first stable per major, verified from `releases.electronjs.org/releases.json`; all `esm: true`):

  | major | firstStable | chrome        | node    |
  | ----- | ----------- | ------------- | ------- |
  | 28    | 28.0.0      | 120.0.6099.56 | 18.18.2 |
  | 29    | 29.0.0      | 122.0.6261.39 | 20.9.0  |
  | 30    | 30.0.0      | 124.0.6367.49 | 20.11.1 |
  | 31    | 31.0.0      | 126.0.6478.36 | 20.14.0 |
  | 32    | 32.0.0      | 128.0.6613.36 | 20.16.0 |
  | 33    | 33.0.0      | 130.0.6723.44 | 20.18.0 |
  | 34    | 34.0.0      | 132.0.6834.83 | 20.18.1 |
  | 35    | 35.0.0      | 134.0.6998.44 | 22.14.0 |
  | 36    | 36.0.0      | 136.0.7103.48 | 22.14.0 |
  | 37    | 37.0.0      | 138.0.7204.35 | 22.16.0 |
  | 38    | 38.0.0      | 140.0.7339.41 | 22.18.0 |
  | 39    | 39.0.0      | 142.0.7444.52 | 22.20.0 |
  | 40    | 40.0.0      | 144.0.7559.60 | 24.11.1 |
  | 41    | 41.0.0      | 146.0.7680.65 | 24.14.0 |
  | 42    | 42.0.0      | 148.0.7778.96 | 24.15.0 |
  | 43    | 43.0.0      | 150.0.7871.46 | 24.17.0 |

- **No runtime code changes** in `resolve.ts`, `runtime.ts`, or target derivation; the snapshot is the single source of the window. The `esm: false` path stays (majors < 28 never enter it, but it remains for future-proofing).
- **CI pin version**: `28.3.3` (latest maintained 28.x). Keep the existing `pin: true` + `pnpm add -wD electron@…` + install.js pattern.
- **Docs text**: replace the `41–43` / `>=41 <44` statements in website compatibility guides (en/zh) with `28–43` / `>=28 <44`; keep the "frozen window, floor 28, top rolls with releases" wording consistent with CONTEXT.md and ADR 0011.

## Testing Decisions

Seams (existing, highest-level first):

- `tests/unit/electron-runtime.test.ts` (primary seam):
  - Snapshot shape: `majors` toEqual `[28, 29, …, 43]`; `peerRange` toBe `'>=28 <44'`; spot-check `byMajor[28]` (chrome `120.0.6099.56`, node `18.18.2`, esm true) and `byMajor[37]` (chrome `138.0.7204.35`); every 28–43 entry `esm === true`.
  - Clamp: `electronChromeBrowserslist(28)` → `'chrome >= 120'` (exact, below ceiling); `electronChromeBrowserslist(37)` → `'chrome >= 138'` (at ceiling); `electronChromeBrowserslist(43)` → `'chrome >= 138'` (clamped). Existing 41/43 clamp assertions update.
  - Resolution via `writeFakeElectron({ version: '28.3.3' })` → `major === 28`, derived Main target `['electron28-main']`.
  - Unsupported majors: `27.x` and `44.x` both fail with `RSELECTRON_ELECTRON_UNSUPPORTED` (floor and frozen top).
- `tests/unit/ci-workflow.test.ts`: regex `"electron"\s*:\s*"28\.` present; `"43\.` still present; snapshot serialization assertion `majors: [28, …, 43]` updated.
- `tests/unit/renderer-advanced.test.ts`: switch the fake Electron version from `41.0.0` to `28.0.0` where the derived-browserslist default is asserted (`chrome >= 120`); explicit `electron{N}-renderer` risk-diagnostic cases may keep any in-window major.
- `tests/unit/release-candidate.test.ts`: peerDependencies `electron: '>=28 <44'`; en/zh compatibility docs contain `28–43`.
- `tests/unit/inspect.test.ts` / `benchmark-report.test.ts`: bump fake versions to in-window values only if they encode the window (grep shows only incidental `41.0.0` / `43.2.0` fixtures — update to 28.0.0 / 43.2.0 for freshness, no assertion change).
- e2e: `e2e/electron-smoke.spec.ts` runs under whatever Electron the CI matrix installs — the 28.3.3 leg is the real old-runtime verification (main branch only).

No new test seams needed; no Playwright matrix changes beyond the workflow file.

## Out of Scope

- Majors below 28 (pre-ESM era) — stay hard-rejected.
- Majors above 43 ahead of the next release — stay hard-rejected (top rolls only at release time).
- Warning tier / silent fallback for out-of-window majors (ADR 0005 rejected alternatives remain rejected; ADR 0011).
- browserslist-rs clamp removal (upstream browserslist-rs#48) — unchanged; affects 38+ only.
- e2e example apps for old majors; metadata-unit coverage is the verification surface.

## Further Notes

- Align: `docs/monorail/electron-support-window/align.md`; ADR: `docs/monorail/adr/0011-electron-support-window.md` (en + zh); glossary updated in `CONTEXT.md` / `CONTEXT.zh.md`.
- `releases.electronjs.org/releases.json` is the metadata source; the first-stable extraction was cross-checked to reproduce the existing 41–43 entries exactly. Future release updates should re-run the same extraction (first stable per major) rather than hand-editing.
- If Electron 28 proves problematic on current CI runners (old Chromium on new macOS/Ubuntu), the fallback is to pin 28.x only on the ubuntu leg and keep 43.2.0 elsewhere — the CI-workflow test would need a matching assertion change. Not expected; not a release blocker.
