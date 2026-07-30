# 01 — Format-aware Main/Preload externalization

Status: done
Blocked by: None

## What to build

Stop hard-coding `` `commonjs ${id}` `` for Main/Preload externals. Make externalization follow the role module format: ESM uses Rspack’s `module-import` path (mark external without forcing CommonJS); CJS keeps explicit CommonJS externals; `require`-originated externals under ESM use `node-commonjs` (`createRequire`) instead of bare `require`. Preserve always-external `electron`/builtins and existing `externalizeDeps` include/exclude / isolatedEntries behaviour. Update unit/build fixture asserts that currently expect `require("electron")` under ESM.

## Acceptance criteria

- [x] ESM Main/Preload builds no longer emit bare `require("electron")` / CommonJS-forced dependency externals for static `import`s
- [x] CJS Main/Preload still externalize with CommonJS `require` where format is CJS
- [x] Under ESM, a `require('dep')` of an externalized dependency resolves via `node-commonjs` / `createRequire` (not a naked `require` that throws in ESM scope)
- [x] `externalizeDeps` include/exclude and Preload isolation defaults remain behaviourally unchanged
- [x] `tests/unit/externalize.test.ts` (and related fixtures) updated and green for the new shapes

## Comments

- 2026-07-30: Claimed + implemented. `mergeRspackExternals` is format-aware: ESM marks import externals without `commonjs` (module-import), routes `dependencyType === 'commonjs'` via `node-commonjs`; CJS keeps `` `commonjs ${request}` ``. Unit suite + typecheck + full `rstest` green.
