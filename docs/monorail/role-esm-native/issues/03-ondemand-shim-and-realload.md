# 03 — On-demand ESM require shim + type:module real-load

Status: done
Blocked by: 02

## What to build

For ESM Main/Preload, rely on Rspack `node-module` for `__dirname`/`__filename`. When free `require(` / `require.resolve(` remains in the ESM output graph, inject a thin `createRequire(import.meta.url)` helper—do not always inject a full electron-vite-style shim. Add an integration fixture with `"type": "module"` that real-loads Main (and Preload) via project-local Electron (or equivalent ESM load under the same module rules), covering static `import` externals and residual `require('dep')` externals, asserting no `require is not defined`.

## Acceptance criteria

- [x] ESM outputs without free `require(` / `require.resolve(` do not gain an unnecessary createRequire shim banner
- [x] ESM outputs that retain free `require(` / `require.resolve(` gain a thin `createRequire` helper and load without `require is not defined`
- [x] `__dirname`/`__filename` in ESM do not depend on a duplicated MagicString-style dirname shim when Rspack `node-module` already rewrites them
- [x] Integration: `"type": "module"` app path starts (dev or preview style) with project-local Electron / equivalent real load; no `require is not defined`
- [x] Integration covers both static `import` externals and residual `require('dep')` externals
- [x] Relevant unit/integration tests green

## Comments

- 2026-07-30: Claimed + implemented. `applyEsmRequireShim` sets `node.__dirname`/`__filename: 'node-module'` and injects thin `createRequire(import.meta.url)` only when free `require(` / `require.resolve(` remain in ESM assets. Unit `esm-shim.test.ts` + integration `vanilla-esm-type-module` / `esm-type-module.test.ts`. Typecheck + full `rstest` 114/114 green.
