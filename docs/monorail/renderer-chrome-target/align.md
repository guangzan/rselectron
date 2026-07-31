# Align: renderer-chrome-target

## Intent

Fix sandboxed Renderer builds that throw `global is not defined` because the default Rspack target was `electron${N}-renderer` (chunk runtime on `global`). Derive an Electron-Chromium browserslist default through Rsbuild’s official pipeline. Vite-style `chrome${M}` on `tools.rspack.target` is illegal in Rspack; raw snapshot `chrome >= ${M}` is currently unusable because browserslist-rs cannot resolve Chromium majors beyond its DB ceiling (~138) while the support snapshot records 146+.

## Decisions settled

- **Default Renderer compiler target:** auto-write only `output.overrideBrowserslist: ['chrome >= ${min(M, K)}']`, and leave `tools.rspack.target` unset so Rsbuild `pluginTarget` produces `['web', 'browserslist:…']`.
- **`M`:** Chromium major from the Electron support snapshot’s `chrome` field for the project-local Electron major.
- **Clamp ceiling `K`:** hard-coded constant **`138`**, matching today’s `@rspack/binding` browserslist-rs DB (`chrome >= 138` resolves; `chrome >= 139` is empty and fails the build). When `M > K`, **silently** clamp to `K` (no diagnostic).
- **Upstream tracking:** [browserslist/browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48). After that (or an equivalent binding bump) covers snapshot Chromium, remove the clamp and use true `chrome >= ${M}` — deferred, not a blocker for shipping the sandbox fix.
- **Rejected for now:** bare `web` / fixed `['web','es*']` only (does not express Chromium via browserslist); blocking the sandbox fix until browserslist-rs catches up.
- **Suppression:** skip auto-write when the role already sets `overrideBrowserslist` **or** `tools.rspack.target`.
- **Project-level browserslist:** do not probe `.browserslistrc` / `package.json#browserslist`. Auto `overrideBrowserslist` may cover them (Rsbuild priority).
- **`output.target`:** env preset only; does **not** suppress Chromium browserslist derivation. Unset Renderer `output.target` still defaults to `web` after normalization.
- **Main / Preload unchanged:** keep `tools.rspack.target: electron${N}-main` / `electron${N}-preload`.
- **Risk diagnostic:** explicit `electron-renderer` / `electron${N}-renderer` (plus existing risky values) still warn; default browserslist path does not.
- **No first-class `nodeIntegration`.**
- **Change class:** bug fix aligning implementation with the Chromium/web contract under Rspack/Rsbuild + current browserslist-rs limits.
- **Framework vs author config:** prefer `.browserslistrc` remains author advice; Rselectron injects the Electron-derived default via per-role `overrideBrowserslist`.

## Deferred

- Remove clamp `K` once browserslist-rs / Rspack binding covers snapshot Chromium majors ([#48](https://github.com/browserslist/browserslist-rs/issues/48))
- First-class `nodeIntegration` (or similar) config
- Moving Main/Preload derivation to `overrideBrowserslist: ['node >= …']`
- Dual-writing `tools.rspack.target` alongside `overrideBrowserslist` for Renderer

## Out of scope

- Application packaging (electron-builder / Forge)
- Changing Electron support snapshot contents or peer range
- Vite/electron-vite drop-in compatibility beyond this behavioural parity point
- Broader `output.target` vs compiler-target merge redesign beyond this bug fix
- Auto-creating or mutating project `.browserslistrc`
- Waiting on browserslist-rs before shipping any sandbox `global` fix

## Domain pointers

- Glossary: `docs/monorail/CONTEXT.md` — Derived compiler target, Electron support snapshot, Renderer role
- ADR: `docs/monorail/adr/0010-renderer-chrome-compiler-target.md` (extends `0007-electron-role-build-contract.md`)
- Prior halt notes: issue `01` comments (illegal `chrome*` Rspack target; browserslist-rs empty resolve for `chrome >= 140+`)
- Upstream: https://github.com/browserslist/browserslist-rs/issues/48
