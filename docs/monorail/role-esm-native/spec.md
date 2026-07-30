# Spec: role-esm-native

## Problem Statement

When an Electron app’s application manifest uses `"type": "module"`, Rselectron derives ESM for Main/Preload (`output.module: true`). Dependency externalization nevertheless forced CommonJS externals (`` `commonjs ${id}` ``), so successful builds could still throw `require is not defined` at Electron load time. Workarounds (force `format: 'cjs'` + `.cjs` filenames) work but contradict the derived-ESM product story and fight Rsbuild/Rspack 2 Node ESM defaults (`externalsType: module-import`, `[name].mjs`, `node-module` for `__dirname`/`__filename`).

## Solution

Deliver **C-native** Main/Preload ESM open-box behaviour in three layers:

1. **Format-aware externalization** — stop hard-coding CommonJS externals; follow role module format via Rspack `externalsType`, and use `node-commonjs` for `require`-originated externals under ESM.
2. **Entry filename policy** — when `output.filename` is unset, default to `[name].mjs` (ESM), `[name].cjs` (CJS + `"type": "module"`), else `[name].js`; keep unhashed stable names; warn on dangerous explicit overrides; keep entry↔manifest mismatch severity as today.
3. **On-demand ESM require shim** — rely on Rspack for `__dirname`/`__filename`; inject thin `createRequire(import.meta.url)` only when free `require(` / `require.resolve(` remains.

Do not default to `modern-module` or MagicString-first full shims. Prove with unit/fixture asserts and Electron real-load integration.

## User Stories

1. As an app author with `"type": "module"`, I want Main/Preload ESM outputs to load in Electron without hand-rolled `.cjs` workarounds, so that derived format matches runnable artifacts.
2. As an app author who still writes occasional `require('dep')` in Main/Preload, I want those externals to resolve under ESM, so that migration-era code does not crash on bare `require`.
3. As an app author who sets an explicit `output.filename`, I want a clear warning when the extension fights `type`/format, without a hard build failure, so that advanced layouts remain possible.
4. As a maintainer, I want compile-time and Electron real-load regressions for this contract, so that “supports ESM” remains an enforceable claim.

## Implementation Decisions

- **Contract authority:** ADR 0009 (extends ADR 0007). Glossary terms: Role module format, Format-aware externalization, Entry filename policy, On-demand ESM require shim.
- **Externalization (`applyExternalization` / Rspack merge):**
  - ESM roles: mark matching requests external without forcing `` `commonjs ${id}` ``; depend on `output.module` → `externalsType: 'module-import'` (or equivalent non-overriding mark).
  - CJS roles: explicit CommonJS externals.
  - When the externalized dependency originates from `require`, emit `node-commonjs` so ESM outputs use `createRequire` instead of bare `require`.
  - Preserve today’s always-external set (`electron`, builtins, `node:`) and `externalizeDeps` include/exclude / isolatedEntries behaviour.
- **Filename defaults:** apply only when the role does not set `output.filename`; update planned Main entry resolution so unset filename no longer assumes `[name].js` under ESM / CJS+`type:module`. Explicit filename always wins.
- **Diagnostics:** structured warning for dangerous explicit extension overrides; entry mismatch keeps existing `dev`/`preview` error vs `build` warning severity.
- **Shim:** detect free `require(` / `require.resolve(` in ESM Main/Preload emission path; inject minimal `createRequire` helper; do not duplicate dirname/filename shims already handled by Rspack `node-module`.
- **Inspect/docs:** surface format, externals posture, and entry filename together where inspect already reports role output (keep changes minimal; full website rewrite is out of scope unless a one-line contract note is required for accuracy).
- **Order:** implement and land A, then B, then C (issues may chain).

## Testing Decisions

External behaviour over implementation details. Confirmed seams:

1. **`tests/unit/externalize.test.ts` (+ build fixtures)** — ESM external shape (no bare `require("electron")` under ESM); `node-commonjs` / `createRequire` for `require`-originated externals; CJS path still uses `require` where format is CJS.
2. **Runtime/entry unit tests** (`electron-runtime.test.ts` / planned Main entry helpers) — default `.mjs` / `.cjs` / `.js` policy; dangerous override warning; planned entry tracks filename policy for manifest comparison.
3. **Integration** — extend the existing `createServer` / launch-marker integration style (`tests/integration/dev.test.ts` or preview sibling) with a `"type": "module"` fixture; real-load Main (and Preload) via project-local Electron (or equivalent ESM load of the Main entry under the same module rules); assert no `require is not defined`; cover static `import` externals and residual `require('dep')` externals.

Prefer extending these seams; do not invent a parallel test stack. Shim injection asserts attach to seam 1 or 3.

## Out of Scope

- Renderer role changes
- Packaging tools (electron-builder / Forge)
- Changing format derivation rules themselves
- Defaulting to `externalsType: 'modern-module'`
- MagicString-first full `esmShim` as the primary path
- External app repos as CI gates
- Existing parity exceptions (Vite plugins, bytecode, electron-vite SWC helper)

## Further Notes

- Behavioural references: electron-vite `externalizeDeps` + Preload `.mjs` + `esmShim`; Rspack/Rsbuild 2 Node ESM defaults.
- Product advantage to preserve vs electron-vite: explicit testable externals mapping, default `.cjs` under CJS+`type:module`, structured `RSELECTRON_*` warnings.
- Align source: `docs/monorail/role-esm-native/align.md`.
