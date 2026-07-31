# Spec: renderer-chrome-target

## Problem Statement

Sandboxed Renderer builds throw `ReferenceError: global is not defined` because `@rselectron/core` auto-derives `tools.rspack.target: 'electron${N}-renderer'`. Rspack treats that target as Node-bearing and emits chunk runtime on `global`. Setting only `output.target: 'web'` does not fix it while derivation still stacks `electron*-renderer`.

Vite-style `chrome${M}` on `tools.rspack.target` is illegal in Rspack. Writing true snapshot `overrideBrowserslist: ['chrome >= ${M}']` also fails today: browserslist-rs (via `@rspack/binding`) cannot resolve Chromium majors above ~138 (`chrome >= 140` → empty list → build error), while the support snapshot records Electron Chromium 146+. Tracked upstream as [browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48).

## Solution

Derive Renderer as `output.overrideBrowserslist: ['chrome >= ${min(M, K)}']` with hard-coded **`K = 138`**, leave `tools.rspack.target` unset, and let Rsbuild compose `['web', 'browserslist:…']`. Clamp silently when `M > K`. Keep Main/Preload on `electron${N}-*`. Expand risk diagnostics for explicit `electron*-renderer`. Ship this clamped default now; remove the clamp in a follow-up after browserslist-rs covers snapshot Chromium.

## User Stories

1. As an app author using a sandboxed Renderer, I want the default build to use a Chromium/web chunk runtime that actually builds, so that `pnpm run dev` does not throw `global is not defined` or fail browserslist parse.
2. As an app author who enables Node in the Renderer, I want to set `tools.rspack.target` myself and receive `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`, so that the dangerous path is explicit.
3. As a maintainer, I want tests and matrix evidence to expect `chrome >= ${min(M, 138)}` for Renderer defaults, and a recorded path to drop the clamp after [#48](https://github.com/browserslist/browserslist-rs/issues/48).

## Implementation Decisions

- **Snapshot mapping:** From `ELECTRON_SUPPORT_SNAPSHOT.byMajor[N].chrome`, take Chromium major `M`, then query `chrome >= ${min(M, K)}` with **`K = 138`** (named constant).
- **Apply path (Renderer):** Write only `output.overrideBrowserslist: [query]`. Do not set `tools.rspack.target`. Do not write Vite `chrome${M}` as an Rspack target.
- **Clamp:** When `M > K`, use `K` silently (no diagnostic).
- **Apply path (Main/Preload):** Unchanged — `tools.rspack.target: electron${N}-main` / `electron${N}-preload`.
- **Suppression:** Skip when `overrideBrowserslist` or `tools.rspack.target` is set. Do not probe project-level browserslist files.
- **`output.target`:** Does not suppress derivation. Unset Renderer `output.target` defaults to `web` after normalization.
- **Risk detector:** Explicit `electron-renderer` / `/^electron\d+-renderer$/` (plus existing risky values) warn; default browserslist path does not.
- **No new config:** No first-class `nodeIntegration` flag.
- **Docs/matrix:** Update BUILD-003 / BUILD-005; troubleshooting may note default browserslist + clamp / #48 and escape hatch `tools.rspack.target: 'web'`.
- **Follow-up (out of this ticket’s acceptance):** After browserslist-rs covers snapshot majors, set `K` aside and use true `M` (separate small change).

## Testing Decisions

External behaviour (normalize / build config surface), not Electron GUI.

**Seams (confirmed):**

1. **`tests/unit/electron-runtime.test.ts` (+ snapshot helper)** — Helper maps majors to `chrome >= ${min(M, 138)}` (today 41→`chrome >= 138`, 43→`chrome >= 138`). Default path: Main/Preload `electron{N}-*` on `tools.rspack.target`; Renderer `overrideBrowserslist: ['chrome >= 138']` for current snapshot majors; no illegal `chrome*` on `tools.rspack.target`. `output.target: 'web'` does not suppress. Explicit `overrideBrowserslist` / `tools.rspack.target` suppress. Unsupported Electron major still fails. **Full `build()` of Renderer with derived browserslist must succeed** (no empty browserslist parse error).
2. **`tests/unit/renderer-advanced.test.ts`** — Explicit `electron{N}-renderer` / `electron-renderer` emit risk; default browserslist path does not; keep `output.target: "node"` coverage. Renderer-only fixtures that lack Electron must either install fake Electron or set an explicit compiler target once `output.target` no longer suppresses package-backed derivation.
3. **`docs/monorail/compatibility-matrix.md` BUILD-003 / BUILD-005** — Evidence updated in the same implementation work.

**Not required:** Electron e2e for `global is not defined`; removing the clamp after #48.

## Out of Scope

- Removing clamp before browserslist-rs / binding covers snapshot Chromium
- First-class `nodeIntegration` config
- Main/Preload browserslist migration
- Dual-writing Renderer `tools.rspack.target` + browserslist
- Mutating project `.browserslistrc`
- Snapshot / peer-range content changes
- Packaging

## Further Notes

- Align: `docs/monorail/renderer-chrome-target/align.md`
- ADR: `docs/monorail/adr/0010-renderer-chrome-compiler-target.md`
- Upstream: https://github.com/browserslist/browserslist-rs/issues/48
- Halt history: illegal Rspack `chrome*`; then unclamped `chrome >= M` empty-resolve on majors ≥140
