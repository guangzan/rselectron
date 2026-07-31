# 01 — Derive Renderer chrome browserslist (clamped) and expand risk diagnostic

Status: done  
Blocked by: None

## What to build

Change `@rselectron/core` so auto-derived Renderer compiler target is `output.overrideBrowserslist: ['chrome >= ${min(M, K)}']` with hard-coded **`K = 138`**, from the support snapshot Chromium major (not `electron${N}-renderer`, not illegal `tools.rspack.target: 'chrome${M}'`, not unclamped `chrome >= M` that browserslist-rs rejects for 146+). Leave Renderer `tools.rspack.target` unset on the default path. Keep Main/Preload on `electron${N}-*`. Ensure `output.target` does not suppress browserslist derivation; explicit `overrideBrowserslist` or `tools.rspack.target` still does. Clamp silently when `M > K`. Extend `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK` for explicit `electron-renderer` / `electron${N}-renderer` (finish if still partial). Update unit tests and BUILD-003 / BUILD-005. Update troubleshooting for the clamped default / #48 and the `tools.rspack.target: 'web'` escape hatch if needed.

## Acceptance criteria

- [x] Snapshot helper maps e.g. major 41 (`chrome` 146.x) → `chrome >= 138` and major 43 → `chrome >= 138` via `min(M, 138)`; constant `K` is explicit in code
- [x] Default normalize/build path: Main/Preload `electron{N}-*` on `tools.rspack.target`; Renderer `overrideBrowserslist: ['chrome >= 138']` for current snapshot majors; Renderer does **not** set `tools.rspack.target` to `chrome*`
- [x] Full Renderer `build()` with derived defaults succeeds (no `Unknown target 'chrome…'` and no empty browserslist parse error)
- [x] `output.target: 'web'` alone does not suppress Renderer browserslist derivation
- [x] Explicit `overrideBrowserslist` or `tools.rspack.target` suppresses derivation; project-level `.browserslistrc` is not probed
- [x] Explicit `electron{N}-renderer` / `electron-renderer` emits `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`; default browserslist path does not
- [x] Existing risk cases (`output.target: "node"`, etc.) still warn; unsupported Electron major still fails as today
- [x] No diagnostic when clamping `M > K`
- [x] `docs/monorail/compatibility-matrix.md` BUILD-003 / BUILD-005 evidence matches
- [x] No new first-class `nodeIntegration` config flag

## Comments

- 2026-07-31 build halt: Vite-style `chrome${M}` as `tools.rspack.target` illegal in Rspack 2.1.
- 2026-07-31 build halt (browserslist-rs): unclamped `chrome >= ${M}` for snapshot 146+ fails — DB ceiling ~138. Upstream: https://github.com/browserslist/browserslist-rs/issues/48
- 2026-07-31 re-align: ship `chrome >= ${min(M, 138)}` silent clamp; defer true `M` until #48 / binding bump. Status reset to `open` for `/rail-build`. Removing clamp is **not** this ticket.
- 2026-07-31 done: `BROWSERSLIST_CHROME_MAJOR_CEILING = 138`; Renderer writes clamped `overrideBrowserslist`; Main/Preload unchanged; Renderer `output.target` no longer gates package need; risk coverage retained; unit (excl. pre-existing `ci-workflow` drift) + integration green; typecheck clean.
