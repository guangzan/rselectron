# Align: prefer-esm-path

## Intent

Runtime for ESM-native Main/Preload (`role-esm-native`) and CJS import-only diagnostics (`cjs-import-only-diag`) is already shipped. Consumer guidance still points the wrong way: troubleshooting and `RSELECTRON_IMPORT_ONLY_EXTERNAL` list `externalizeDeps.include` first, and beta apps that pinned `format: "cjs"` plus `webpackIgnore` / include whitelists are not told to **upgrade and drop those workarounds**. Reorder the product narrative so the Preferred ESM path is the default recommendation—not CJS + include as the primary cure.

## Decisions settled

- **Gap class: guidance + message priority** — no new format derivation, no auto-`include`, no reversing ADR 0009’s CJS → CommonJS externals. Ship docs + diagnostic copy (and glossary mitigation order) that match the already-landed ESM-native contract.
- **Preferred ESM path (primary):** for apps with `"type": "module"` (and Electron that supports ESM Main/Preload), keep `electron.format: 'auto'` (or omit it) so roles derive **ESM**; align `package.json#main` / preload paths with the entry filename policy (typically `.mjs`). Do **not** recommend pinning `format: 'cjs'` to paper over import-only / dual-package pain.
- **Drop beta workarounds:** migration / troubleshooting should explicitly tell early adopters to remove, after upgrading past ESM-native + import-only diag: (1) forced `format: 'cjs'` used only to dodge ESM load failures, (2) `externalizeDeps.include` whitelists added solely for import-only packages that ESM would externalize cleanly, (3) `webpackIgnore` / magic-comment native `import()` escapes used as the app’s default interop strategy.
- **Import-only mitigation order (supersedes `cjs-import-only-diag` messaging priority):**  
  1. Prefer switching the role to ESM (`format: 'esm'` or `auto` under `"type": "module"`) — Preferred ESM path.  
  2. If the app **intentionally** stays on CJS, then `externalizeDeps.include` (bundle).  
  3. Bundler-ignore native `import()` remains an advanced app-side footnote only; never a recommended primary fix; docs should say to remove it once on the Preferred ESM path.
- **Diagnostic string:** rewrite `RSELECTRON_IMPORT_ONLY_EXTERNAL` message to put ESM / remove `format: 'cjs'` first, `include` second. Keep the same diagnostic code.
- **Docs surfaces (en + zh):** troubleshooting import-only section; `externalizeDeps` / `format` config notes; migration checklist item for dropping CJS workarounds. `format: 'cjs'` may remain as a valid explicit override example, but must not be framed as the cure for ESM-only dependencies.
- **Relationship to prior efforts:** `role-esm-native` = capability; `cjs-import-only-diag` = detection + docs shell; this effort = **adoption narrative** and message ordering so consumers leave the CJS workaround path.
- **Acceptance seams:** unit assert on diagnostic message order/phrases; `tests/docs/docs-site.test.ts` for preferred-ESM-first copy in troubleshooting / migration (and config if it restates the order).

## Deferred

- Auto-`include` of import-only packages
- Framework-preserved native `import()` under CJS externals
- Renaming `include`/`exclude`
- Warning that fires when `format: 'cjs'` is pinned under `"type": "module"` without other justification (optional future lint)
- External consumer-app CI gates (e.g. ai-chat-app-electron)

## Out of scope

- Changing format derivation rules or ADR 0009 externals shapes
- Renderer role behaviour
- Packaging / scaffolder
- Default Main/Preload watch
- Conventional role outputs / `out/` layout (`out-layout-preset`)
- Workspace-protocol externals heuristics (separate research)

## Domain pointers

- Glossary: Preferred ESM path (new); Import-only external risk (mitigation order updated); Role module format; Format-aware externalization
- ADR: `docs/monorail/adr/0009-esm-native-main-preload-output.md`
- Prior: `docs/monorail/role-esm-native/`, `docs/monorail/cjs-import-only-diag/` (messaging priority partially superseded here)
- Consumer pain context: pinned `format: "cjs"`, `include` whitelists, `webpackIgnore` dynamic import — products of pre-ESM-native betas, not the recommended steady state
