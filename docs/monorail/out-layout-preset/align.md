# Align: out-layout-preset

## Intent

Close the gap between the accepted Electron role build contract (default outputs under `out/<role>`) and today’s unset fallback (`<roleRoot>/dist`). Conventional apps should stop hand-writing `output.distPath` (and absolute path workarounds) just to get the layout ADR 0007 already promises. Make the Role preset inject that layout when unset, keep explicit overrides intact, and align docs/examples with the real default.

## Decisions settled

- **Gap class:** implementation of an already-accepted convention (ADR 0007 / BUILD-001), not a new packaging or scaffolding product. No new ADR; optionally note in BUILD-001 evidence when landed.
- **When to inject:** for each configured Role, if `output.distPath` is unset **or** `output.distPath` is an object without a usable `root` (and not a string form), inject the conventional root. Any explicit string `distPath` or object with `root` wins and keeps today’s resolution rules (relative paths resolve against the Role `root`, else application root).
- **Injected path:** Application-root-relative convention `out/main`, `out/preload`, `out/renderer`. During normalization, set `output.distPath.root` to `resolve(appRoot, 'out', role)` (absolute) so custom Role `root` values (e.g. `./src/main`) still emit beside the app root, not under `src/main/out/...` or `src/main/dist`.
- **Planned entry / diagnostics:** `plannedMainEntry`, `roleDistRoot`, entry↔manifest mismatch checks, and renderer-only reuse validation must observe the injected path the same way they observe an explicit one.
- **Other Node defaults unchanged here:** Main/Preload `filenameHash: false` and entry filename policy remain as already shipped (ADR 0007 / 0009). This effort does not re-litigate them.
- **Docs / examples:** Getting started and learning examples must describe `out/<role>` as the unset default (today’s copy still teaches `root/dist` + optional `distPath`). Example `package.json#main` (or documented entry) tracks the planned Main output under the entry filename policy. Fixtures that already set `out/<role>` may stay explicit or drop the redundant `distPath` once the preset exists.
- **Migration posture:** no production-user migration window claimed; changing the unset default from `<roleRoot>/dist` → `out/<role>` is acceptable for beta. Document the change in migration / getting-started so early adopters who relied on `root/dist` without setting `distPath` know to set an explicit `distPath` or point `main` at `out/...`.
- **Acceptance seam:** unit/normalize asserts that unset configs receive `out/<role>` under `appRoot`; explicit `distPath` is preserved; at least one build or example path proves outputs land under `out/` without hand-written `distPath`. Prefer extending existing `electron-runtime` / build / docs-site seams.

## Deferred

- Renderer default `output.assetPrefix: './'` for `build` / `preview` (file-protocol relative assets) when unset — related Electron-preset ergonomics, not required to close the `out/` layout gap
- Zero-config Role discovery with no `rselectron.config.*` (remaining BUILD-001 partial)
- Helpers that generate BrowserWindow `loadURL` / `loadFile` / preload path resolution boilerplate
- Packaging `extraResources` / asarUnpack compose guides (separate compose-docs effort)
- Changing resolution rules for **explicit** relative `distPath` strings

## Out of scope

- Default-enabling Main/Preload `watch` in `dev` (ADR 0003)
- Embedding electron-builder / Forge or a project scaffolder (ADR 0001)
- Implicit cross-Role `shared` config block (ADR 0002; keep `mergeRselectronConfig`)
- Format / externalizeDeps / ESM-native behaviour (owned by `role-esm-native` / `cjs-import-only-diag`)
- Electron support snapshot / peer range changes (ADR 0005)

## Domain pointers

- Glossary: `docs/monorail/CONTEXT.md` — Role preset; Conventional role outputs (added/clarified by this align); Application root; Electron entry
- ADR: `docs/monorail/adr/0007-electron-role-build-contract.md` (default outputs `out/<role>`; Role presets)
- Matrix: `docs/monorail/compatibility-matrix.md` — BUILD-001 (Partial: convention documented, preset injection / zero-config discovery not complete)
- Consumer pain context: migration apps hand-writing absolute `distPath` while ADR already names `out/<role>`
