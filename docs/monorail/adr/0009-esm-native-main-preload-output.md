# 0009. ESM-native Main/Preload output (C-native)

- Status: Accepted
- Date: 2026-07-30
- Extends: [0007-electron-role-build-contract.md](./0007-electron-role-build-contract.md)

## Context

Rselectron derives Main/Preload module format from Electron capability, application manifest `"type"`, and `electron.format`. When the format is ESM, Rsbuild/Rspack set `output.module: true`, which defaults `externalsType` to `module-import` and prefers `[name].mjs`, and rewrites `__dirname`/`__filename` via `node-module`.

The previous externalization path forced `` `commonjs ${request}` `` for every external. That override defeats Rspack’s ESM defaults: nominal ESM outputs still contained bare `require(...)`. Under `"type": "module"`, Electron loads `.js` as ESM and throws `require is not defined`. Real migrations worked around this by forcing `format: 'cjs'` and `.cjs` filenames—correct as a workaround, incomplete as product behaviour.

electron-vite avoids the mismatch by marking packages `external` without hard-coding CommonJS, forcing Preload ESM to `.mjs`, and injecting an `esmShim` for residual CJS globals. Rselectron should match that open-box outcome while preferring Rsbuild/Rspack-native levers.

## Decision

### Format-aware externalization

Main/Preload dependency externalization must not unconditionally emit CommonJS externals.

- Mark matching requests external without a hard-coded `commonjs` type when the role format is ESM, so Rspack can use `module-import` (or the configured `externalsType`).
- When the role format is CJS, use CommonJS externals explicitly.
- When an externalized request originates from `require`, use `node-commonjs` so ESM bundles obtain `createRequire` instead of bare `require`.
- Do not adopt `externalsType: 'modern-module'` as the default in this decision; it may be evaluated later with Electron real-load evidence.

### Entry filename policy

“Stable entry filenames” (ADR 0007) means **unhashed, referenceable** entry names—not a permanent `.js` extension.

When the role does not set `output.filename`:

| Role format | Application `"type"` | Default entry pattern |
| ----------- | -------------------- | --------------------- |
| `esm`       | any                  | `[name].mjs`          |
| `cjs`       | `module`             | `[name].cjs`          |
| `cjs`       | not `module`         | `[name].js`           |

Explicit `output.filename` always wins. Planned Main output continues to be compared to the Electron entry; mismatches keep today’s severity (error in `dev`/`preview`, warning in `build`). Dangerous explicit combinations (ESM or CJS+`type:module` forced to `.js`) emit a structured warning and still build.

### On-demand ESM require shim

For ESM Main/Preload outputs:

- Prefer Rspack Node ESM defaults for `__dirname` / `__filename` (`node-module`).
- Inject a thin `createRequire(import.meta.url)` helper only when free `require(` / `require.resolve(` remains in the emitted ESM graph.
- Do not always inject a full electron-vite-style shim banner.

### Acceptance

Capability claims for `"type": "module"` Main/Preload require both compile-time asserts and at least one Electron real-load path that fails on `require is not defined`.

## Consequences

- `"type": "module"` apps can keep derived ESM without hand-rolling `.cjs` workarounds.
- Default entry extensions may change relative to earlier `.js` assumptions; `package.json#main` and preload paths must track planned outputs (diagnostics already exist).
- Externalization unit tests that assert `require("electron")` under ESM must be rewritten for ESM import / `node-commonjs` shapes.
- Documentation and inspect output should surface format, externals posture, and entry filename together.
- CJS roles still emit CommonJS externals; a dynamic or static import of an import-only package (including subpaths) may be rewritten to `require` and fail only at runtime. That tension is covered by Import-only external risk diagnostics and docs—not by reversing this ADR's CJS externals choice.

## Alternatives considered

### Keep forcing CommonJS externals and document `.cjs` workarounds

Rejected: contradicts derived ESM and Rsbuild 2 Node defaults; produces successful builds that Electron cannot load.

### Clone electron-vite’s MagicString `esmShim` as the primary fix

Rejected as the primary path: Rspack already supplies `externalsType`, `.mjs` defaults, and `node-module` dirname/filename. A thin on-demand shim remains as fallback only.

### Default to `externalsType: 'modern-module'`

Deferred: attractive for `require`→`createRequire` on Node targets, but needs Electron Main/Preload real-load validation before becoming the contract default.
