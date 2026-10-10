# 0010. Renderer default compiler target is Electron Chromium via browserslist

- Status: Accepted
- Date: 2026-07-31
- Extends: [0007-electron-role-build-contract.md](./0007-electron-role-build-contract.md)

## Context

ADR 0007 and BUILD-005 already require an Electron-compatible web/Chromium default for the Renderer role. Implementation instead derived `electron${N}-renderer` for all three roles via a shared helper. Rspack treats `electron*-renderer` as a Node-bearing environment and emits chunk runtime on `global` (`global.rspackChunk`). Today’s default sandboxed Renderer (no `nodeIntegration`) has no `global`, so apps fail with `ReferenceError: global is not defined` even when `output.target` is `web`.

electron-vite presets Renderer `build.target` to `chrome${N}`. That Vite/esbuild string is **not** a valid Rspack `AllowTarget`. Rsbuild’s native path is `output.overrideBrowserslist` → `pluginTarget` → `['web', 'browserslist:…']`.

A further constraint applied at the time: the then-pinned `@rspack/binding` browserslist-rs could not resolve Chromium majors beyond its DB ceiling (about **138**), so queries such as `chrome >= 140` resolved to an empty list and failed the build while the support snapshot records Electron Chromium **146+**. Tracked upstream as [browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48); the data shipped in later bindings and the temporary clamp has since been removed (see “Removed clamp”).

## Decision

### Default derived targets by role

When auto-deriving the compiler target:

| Role     | Derived value                                                                                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main     | `tools.rspack.target: 'electron${N}-main'`                                                                                                                                             |
| Preload  | `tools.rspack.target: 'electron${N}-preload'`                                                                                                                                          |
| Renderer | `output.overrideBrowserslist: ['chrome >= ${M}']` where `M` is the Chromium major from the support snapshot for Electron major `N`. Do **not** set `tools.rspack.target` on this path. |

Do not write Vite-style `chrome${M}` into `tools.rspack.target`.

`output.target` remains an Rsbuild environment preset (`web` for Renderer when unset). It does **not** suppress Chromium browserslist derivation.

### Suppression

Skip Renderer browserslist derivation when the role already sets `output.overrideBrowserslist` or `tools.rspack.target`. Do not probe project-level `.browserslistrc` / `package.json#browserslist`.

### Opt-in to Electron Renderer targets

No first-class `nodeIntegration` flag. Users who need Electron/Node globals set an explicit compiler target (typically `tools.rspack.target: 'electron${N}-renderer'`).

### Security diagnostic

`RSELECTRON_RENDERER_NODE_INTEGRATION_RISK` must fire for explicit risky targets, including `electron-renderer` and `electron${N}-renderer`. The default browserslist path must not emit this diagnostic.

### Removed clamp

`K = 138` was a temporary product constant tied to the browserslist-rs data of the then-pinned `@rspack/binding`. Upstream [#48](https://github.com/browserslist/browserslist-rs/issues/48) closed on 2026-08-01 and the data shipped in later bindings (`2.1.9`+ resolve the full snapshot Chromium range). The clamp was removed: the workspace `@rsbuild/core` devDependency moved from `2.1.7` to `2.1.13` (same 2.1.x minor line), and the derived target is now the exact snapshot major `chrome >= ${M}`. An application still on an older `@rsbuild/core` (binding < `2.1.9`) that builds Renderer under Electron 38+ (Chromium 140+) must bump within the tested minor line.

### Change class

Bug fix for an incorrect Node-bearing Renderer default, encoded legally for Rspack/Rsbuild under current browserslist-rs limits. Do not treat “sandboxed Renderer expecting Node `global` by default” as a supported migration path.

## Consequences

- Sandboxed open-box Renderer builds use a browser chunk runtime via Rsbuild’s `web` + browserslist composition.
- BUILD-003 / BUILD-005 evidence expects Renderer `overrideBrowserslist: ['chrome >= ${M}']` (the exact snapshot Chromium major); Main/Preload stay on `electron{N}-*`.
- Apps that need Node in the Renderer must opt in explicitly and accept the risk diagnostic.
- The clamp was removed once browserslist-rs caught up (see “Removed clamp”).
