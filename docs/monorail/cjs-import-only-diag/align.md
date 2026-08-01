# Align: cjs-import-only-diag

## Intent

When Main/Preload use CJS and a dependency is CommonJS-externalized, import-only packages (including subpaths whose `exports` lack `require`/`default`) can produce a successful build that fails at runtime (`require` of ESM / `is not a function`). Authors need a build-time warning and docs that name the failure mode and the supported escapes—so they do not discover the break only after launch.

## Decisions settled

- **Scope: diagnostic + docs only** — do not change default externalization, do not auto-`include` import-only packages, do not preserve native `import()` by default in the framework.
- **Trigger:** for Main and Preload when role format is CJS, inspect **actual CommonJS-externalized requests** (including subpaths). Apply a **pragmatic heuristic** for import-only (exports without usable CJS conditions and/or `type:module` / `module`-only signals). Prefer surfacing risk over a perfect Node resolver.
- **Severity:** structured **warning**, never blocks `dev` / `preview` / `build`.
- **Messaging:** prefer `externalizeDeps.include` (bundle) or `format: 'esm'`; document `webpackIgnore` / magic-comment native `import()` only as an advanced app-side footnote—do not promise the framework silences the warning for that path.
- **Docs:** dual-write troubleshooting + `externalizeDeps` config pages; **narrative aligned with electron-vite** (`ERR_REQUIRE_ESM` / ESM-only framing and the two primary escapes), with **key-name mapping** to Rselectron (`include` = bundle; electron-vite’s `exclude` = same intent).
- **Domain:** no new ADR; add glossary term _Import-only external risk_; optional one-line pointer in ADR 0009 Consequences.

## Deferred

- Auto-`include` of import-only packages
- Framework default that preserves dynamic `import()` under CJS externals
- Perfect “would Node allow require?” simulation
- Warning suppress / ignore list beyond “stop externalizing via `include`”

## Out of scope

- Changing ADR 0009’s CJS → CommonJS externals decision
- Renderer role behaviour
- Application-side OpenCode / consumer app fixes (may remain in app repos)
- Renaming `include`/`exclude` to match electron-vite

## Domain pointers

- Glossary: `docs/monorail/CONTEXT.md` — Import-only external risk; Format-aware externalization; Role module format
- ADR: `docs/monorail/adr/0009-esm-native-main-preload-output.md` (known tension: CJS still uses CommonJS externals)
- Related prior effort: `docs/monorail/role-esm-native/` (opposite failure direction)
- Behavioural doc reference: electron-vite troubleshooting `ERR_REQUIRE_ESM` + dependency-handling `exclude` (bundle)
- **Messaging priority:** primary-fix order (`include` before ESM) is superseded by `docs/monorail/prefer-esm-path/align.md` (Preferred ESM path first; `include` only when CJS is intentional)
