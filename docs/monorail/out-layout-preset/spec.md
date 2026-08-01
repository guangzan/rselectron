# Spec: out-layout-preset

## Problem Statement

ADR 0007 and BUILD-001 document Conventional role outputs under `out/main`, `out/preload`, and `out/renderer`. When `output.distPath` is unset, normalization nevertheless falls through to Rsbuild’s `<roleRoot>/dist` (see `plannedMainEntry` / `roleDistRoot` fallbacks of `'dist'`). Authors and learning docs either hand-write `distPath` (often absolute) or teach `src/main/dist/...` as the default—contradicting the accepted contract and recreating the migration boilerplate this effort exists to remove.

## Solution

Inject Conventional role outputs in Role preset normalization:

1. **Preset injection** — for each configured Role, when `output.distPath` is unset or is an object without a usable `root`, set `output.distPath.root` to `resolve(appRoot, 'out', role)`. Explicit string `distPath` or object with `root` always wins and keeps today’s relative-resolution rules (relative → Role `root`, else application root).
2. **Downstream consistency** — `plannedMainEntry`, `roleDistRoot`, entry↔manifest mismatch, and renderer-only reuse continue to read the normalized Role config (already post-`normalizeRuntime`); no change to mismatch severity.
3. **Docs / examples** — getting-started (en + zh) and migration note the unset default as `out/<role>`; learning examples’ `package.json#main` (and any documented entry) track the planned Main output under the entry filename policy. Optional: drop redundant explicit `distPath` from fixtures that only restate `out/<role>`.

No new ADR. Glossary already defines Conventional role outputs / Role preset.

## User Stories

1. As an app author with a minimal three-role config and no `distPath`, I want outputs under `out/<role>` at the application root, so I do not hand-write absolute paths.
2. As an app author who sets an explicit `distPath`, I want that layout preserved unchanged, so custom monorepo / packaging layouts keep working.
3. As an app author reading getting-started, I want `package.json#main` examples to match the real unset default, so entry mismatch diagnostics do not surprise me.
4. As a maintainer, I want normalize/unit and docs-site asserts for the preset, so BUILD-001’s preset-injection gap does not regress.

## Implementation Decisions

- **Contract authority:** ADR 0007; glossary Conventional role outputs, Role preset, Application root, Electron entry. Matrix BUILD-001 (advance evidence for preset injection; zero-config discovery remains deferred).
- **Injection site:** `normalizeRuntime` (same place other Role presets apply). Helper may live beside runtime/entry for testability (`applyConventionalDistPath` or equivalent).
- **Usable `root`:** treat as present when `distPath` is a non-empty string, or when `distPath` is an object whose `root` is a non-empty string. Empty string / missing `root` → inject.
- **Absolute injected root:** always `resolve(appRoot, 'out', role)` so Role `root` like `./src/main` does not nest outputs under the source tree.
- **Do not change:** Main/Preload `filenameHash` / entry filename policy; watch defaults; packaging; renderer `assetPrefix`; resolution rules for explicit relative `distPath`.
- **Docs:** dual-write getting-started Electron entry section; short migration / getting-started note that early beta `root/dist` unset behaviour is replaced—set explicit `distPath: 'dist'` (or role-relative) to keep the old layout, or point `main` at `out/...`.
- **Examples:** vanilla / react `package.json#main` align with planned Main output after preset + entry filename policy (`type: module` → `.cjs` or `.mjs` per ADR 0009).
- **BUILD-001:** when landed, update matrix evidence to note preset injection for unset `distPath`; leave zero-config-without-config-file as still Partial / deferred.

## Testing Decisions

External behaviour over implementation details. Confirmed seams:

1. **`tests/unit/electron-runtime.test.ts`** — unset three-role fixture: normalized `distPath.root` equals `join(appRoot, 'out', role)` for main/preload/renderer; explicit string and object-with-`root` preserved (including relative-to-role-root semantics where already tested or trivially asserted); object without `root` receives injection while preserving sibling `distPath` fields if any.
2. **Build or example path** — at least one path proves artifacts land under `out/` without hand-written `distPath` (extend an existing build fixture / example assert, or a focused unit that reads normalized config into `plannedMainEntry` and asserts `out/main/...`).
3. **`tests/docs/docs-site.test.ts`** — getting-started (en + zh) mentions `out/main` (or `out/<role>`) as the default layout and does not teach `src/main/dist` as the unset default.

Prefer extending these seams; do not invent a parallel test stack.

## Out of Scope

- Renderer default `assetPrefix: './'` for build/preview
- Zero-config Role discovery without `rselectron.config.*`
- Window `loadURL` / `loadFile` / preload path helpers
- Packaging compose guides
- Changing explicit relative `distPath` resolution
- Default Main/Preload watch; packaging/scaffolding; implicit `shared`; ESM/externals; Electron snapshot

## Further Notes

- Align source: `docs/monorail/out-layout-preset/align.md`.
- Today’s getting-started still documents `./src/main/dist/index.js` — that copy is wrong relative to ADR 0007 and must flip with this effort.
- Consumer migration pain: hand-written absolute `distPath` while the ADR already named `out/<role>`.
