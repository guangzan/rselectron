# Align: role-esm-native

## Intent

Make Main and Preload outputs loadable by Electron when the application manifest uses `"type": "module"`, without forcing apps to hand-roll `.cjs` workarounds. Fix the broken combination of nominal ESM (`output.module: true`) and hard-coded CommonJS externals (`require(...)`), and deliver the same open-box ESM experience users get from electron-vite—via Rsbuild/Rspack-native defaults rather than copying MagicString-first shims.

## Decisions settled

- **Target capability set: C-native** — format-aware externalization (A) + unambiguous entry extensions (B) + on-demand thin residual-`require` shim (C). Not mutually exclusive layers; ship the full set.
- **Implementation order: A → B → C** within one effort (issues may split; product narrative commits to C).
- **A — externalization:** Stop emitting `` `commonjs ${id}` `` unconditionally. Prefer marking packages external and letting Rspack’s `externalsType` follow `output.module` (`module-import` for ESM; explicit `commonjs` for CJS). When the dependency request comes from `require`, use `node-commonjs` so ESM outputs get `createRequire` instead of bare `require`. Do **not** default to `modern-module` in this effort.
- **B — entry filenames:** When `output.filename` is unset: ESM → `[name].mjs`; `format: cjs` with `"type": "module"` → `[name].cjs`; otherwise `[name].js`. Explicit `filename` always wins. “Stable entry filenames” means unhashed, referenceable names—not forever `.js`. Emit structured diagnostics when planned Main output and `package.json#main` (or preload paths) disagree. No migration burden (no production users yet).
- **C — residual CJS syntax:** Rely on Rspack `node.__dirname` / `__filename: 'node-module'` for dirname/filename. Inject a thin `createRequire(import.meta.url)` shim only when free `require(` / `require.resolve(` remains in ESM output. Do not always inject a full electron-vite-style `esmShim`.
- **Dangerous explicit overrides** (e.g. ESM + forced `.js`, or CJS + `type:module` + `.js`): warn and continue; do not hard-fail.
- **Acceptance:** Unit/fixture asserts plus at least one Electron real-load path for `type:module` Main (and Preload): `dev`/`preview` must start without `require is not defined`. Cover static `import` externals and residual `require('dep')` externals.
- **Relative to electron-vite:** Match user-visible ESM open-box behaviour; prefer Rspack-native `externalsType` / defaults / diagnostics over MagicString-first cloning. Optional advantages to keep: explicit testable externals mapping, default `.cjs` under CJS+`type:module`, structured `RSELECTRON_*` warnings.

## Deferred

- Default or optional `externalsType: 'modern-module'` with Electron real-load matrix
- MagicString-first full ESM shim as the primary path
- Using an external app repo (e.g. ai-chat-app-electron) as a CI gate

## Out of scope

- Renderer role behaviour
- Application packaging (electron-builder / Forge)
- Changing format derivation itself (`type:module` → ESM when Electron supports it remains as today)
- Existing parity exceptions (Vite plugins, bytecode, electron-vite SWC helper)

## Domain pointers

- Glossary: `docs/monorail/CONTEXT.md` — Role module format, Format-aware externalization, Entry filename policy, On-demand ESM require shim
- ADR: `docs/monorail/adr/0009-esm-native-main-preload-output.md` (extends `0007-electron-role-build-contract.md` on format ↔ externals ↔ extension consistency)
- Baseline reference (behavioural, not drop-in): electron-vite externalizeDeps + preload `.mjs` + esmShim; Rspack/Rsbuild 2 Node ESM defaults
