# Spec: prefer-esm-path

## Problem Statement

ESM-native Main/Preload (`role-esm-native`) and CJS import-only detection (`cjs-import-only-diag`) are already shipped, but consumer-facing copy still treats **CJS + `externalizeDeps.include`** as the first cure. `RSELECTRON_IMPORT_ONLY_EXTERNAL`, troubleshooting, and config notes list `include` before ESM. Early beta apps that pinned `format: "cjs"` and added `include` / `webpackIgnore` whitelists are not told to upgrade onto the Preferred ESM path and drop those workarounds—so the steady-state product story contradicts the landed contract.

## Solution

Reorder adoption narrative without changing runtime externals or format derivation:

1. **Diagnostic message** — keep code `RSELECTRON_IMPORT_ONLY_EXTERNAL`; rewrite text so Preferred ESM path comes first (`format: 'esm'` / `auto` under `"type": "module"`, remove forced `format: 'cjs'`), then intentional-CJS escape via `externalizeDeps.include`.
2. **Docs (en + zh)** — troubleshooting, `externalizeDeps` / `format` config notes, and migration checklist: Preferred ESM path first; drop beta CJS workarounds (`format: 'cjs'`, include-only-for-import-only, `webpackIgnore` as default interop); `include` only when CJS is intentional; bundler-ignore remains an advanced footnote with “remove once on ESM”.
3. **Domain** — glossary Preferred ESM path and Import-only mitigation order already updated in align; no new ADR.

## User Stories

1. As an app author on `"type": "module"` who hit import-only failures after pinning `format: 'cjs'`, I want docs and the warning to tell me to prefer derived ESM and drop that pin, so I do not accumulate include/`webpackIgnore` whitelists.
2. As an app author who intentionally ships CJS Main, I still want `externalizeDeps.include` documented as the CJS-side escape, so I am not forced onto ESM.
3. As an app author reading migration guidance, I want an explicit “drop beta CJS workarounds” checklist item, so upgrading past ESM-native has a clear cleanup step.
4. As a maintainer, I want unit and docs-site asserts on message/doc order, so include-first copy does not regress.

## Implementation Decisions

- **Contract authority:** Glossary Preferred ESM path; Import-only external risk (ordered mitigations); ADR 0009 (unchanged). Prior efforts: `role-esm-native` (capability), `cjs-import-only-diag` (detection; messaging priority superseded here).
- **Diagnostic (`packages/core/src/electron/externalize.ts`):** same code; new message must name the request and state ESM / remove forced `format: 'cjs'` before `externalizeDeps.include`. Do not change when the warning fires.
- **Docs surfaces:**  
  - Troubleshooting import-only section (en + zh): primary fixes ordered ESM first, `include` second; footnote that `webpackIgnore` is not recommended and should be removed on the Preferred ESM path.  
  - Config `externalizeDeps` (and `format` if it restates the cure): same order; `format: 'cjs'` examples may remain as valid overrides but must not be framed as the fix for ESM-only deps.  
  - Migration (en + zh): checklist item to drop forced `format: 'cjs'`, import-only-only `include` lists, and default `webpackIgnore` interop after upgrading.
- **Non-goals in code:** no auto-`include`; no new warning for “`format: 'cjs'` under `type:module`”; no format-derivation changes; no externals-shape changes.

## Testing Decisions

External behaviour over implementation details. Confirmed seams:

1. **`tests/unit/externalize.test.ts`** — existing import-only warning fixtures: assert message (or distinctive phrases) mentions ESM / `format: 'esm'` (or `auto`) **before** `externalizeDeps.include` / `include` (e.g. indexOf order, or regex that encodes order). Trigger conditions unchanged.
2. **`tests/docs/docs-site.test.ts`** — troubleshooting (en + zh) Preferred-ESM-first ordering anchors; migration mentions dropping `format: 'cjs'` / workarounds / Preferred ESM path (or equivalent distinctive phrases); config pages that restate the cure must not put `include` as the sole/first recommended fix ahead of ESM.

Prefer extending these seams; do not invent a parallel test stack.

## Out of Scope

- Auto-including import-only packages
- Framework-preserved native `import()` under CJS
- Renaming `include`/`exclude`
- Optional lint for unjustified `format: 'cjs'` under `"type": "module"`
- External consumer-app CI gates
- Format derivation / ADR 0009 externals changes
- Renderer; packaging; watch defaults; `out-layout-preset`; workspace externals research

## Further Notes

- Align source: `docs/monorail/prefer-esm-path/align.md`.
- `cjs-import-only-diag/align.md` notes messaging-priority supersession.
- Consumer pain: pinned `format: "cjs"`, include whitelists, `webpackIgnore` — pre-ESM-native beta residue, not the recommended steady state.
