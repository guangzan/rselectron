# 0010. Renderer default compiler target is Electron Chromium via browserslist

- Status: Accepted
- Date: 2026-07-31
- Extends: [0007-electron-role-build-contract.md](./0007-electron-role-build-contract.md)

## Context

ADR 0007 and BUILD-005 already require an Electron-compatible web/Chromium default for the Renderer role. Implementation instead derived `electron${N}-renderer` for all three roles via a shared helper. Rspack treats `electron*-renderer` as a Node-bearing environment and emits chunk runtime on `global` (`global.rspackChunk`). Today’s default sandboxed Renderer (no `nodeIntegration`) has no `global`, so apps fail with `ReferenceError: global is not defined` even when `output.target` is `web`.

electron-vite presets Renderer `build.target` to `chrome${N}`. That Vite/esbuild string is **not** a valid Rspack `AllowTarget`. Rsbuild’s native path is `output.overrideBrowserslist` → `pluginTarget` → `['web', 'browserslist:…']`.

A further constraint: current `@rspack/binding` browserslist-rs cannot resolve Chromium majors beyond its DB ceiling (about **138**). Queries such as `chrome >= 140` resolve to an empty list and fail the build, while Rselectron’s support snapshot records Electron Chromium **146+**. Tracked upstream: [browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48).

## Decision

### Default derived targets by role

When auto-deriving the compiler target:

| Role | Derived value |
| ---- | ------------- |
| Main | `tools.rspack.target: 'electron${N}-main'` |
| Preload | `tools.rspack.target: 'electron${N}-preload'` |
| Renderer | `output.overrideBrowserslist: ['chrome >= ${min(M, K)}']` where `M` is the Chromium major from the support snapshot for Electron major `N`, and **`K = 138`** (hard-coded browserslist-rs ceiling). Do **not** set `tools.rspack.target` on this path. |

When `M > K`, clamp **silently** (no diagnostic). Do not write Vite-style `chrome${M}` into `tools.rspack.target`.

`output.target` remains an Rsbuild environment preset (`web` for Renderer when unset). It does **not** suppress Chromium browserslist derivation.

### Suppression

Skip Renderer browserslist derivation when the role already sets `output.overrideBrowserslist` or `tools.rspack.target`. Do not probe project-level `.browserslistrc` / `package.json#browserslist`.

### Opt-in to Electron Renderer targets

No first-class `nodeIntegration` flag. Users who need Electron/Node globals set an explicit compiler target (typically `tools.rspack.target: 'electron${N}-renderer'`).

### Security diagnostic

`RSELECTRON_RENDERER_NODE_INTEGRATION_RISK` must fire for explicit risky targets, including `electron-renderer` and `electron${N}-renderer`. The default browserslist path must not emit this diagnostic.

### Temporary clamp and removal

`K = 138` is a temporary product constant tied to today’s browserslist-rs data. After [#48](https://github.com/browserslist/browserslist-rs/issues/48) (or an equivalent Rspack binding bump) covers snapshot Chromium majors, remove the clamp and use `chrome >= ${M}`. Until then, ship the clamped default so sandboxed apps build and run.

### Change class

Bug fix for an incorrect Node-bearing Renderer default, encoded legally for Rspack/Rsbuild under current browserslist-rs limits. Do not treat “sandboxed Renderer expecting Node `global` by default” as a supported migration path.

## Consequences

- Sandboxed open-box Renderer builds use a browser chunk runtime via Rsbuild’s `web` + browserslist composition.
- BUILD-003 / BUILD-005 evidence expects Renderer `overrideBrowserslist: ['chrome >= ${min(M, 138)}']` (today often `chrome >= 138` for supported majors); Main/Preload stay on `electron{N}-*`.
- Apps that need Node in the Renderer must opt in explicitly and accept the risk diagnostic.
- A follow-up removes the clamp when browserslist-rs catches up.
