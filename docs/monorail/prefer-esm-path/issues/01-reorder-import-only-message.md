# 01 — Reorder IMPORT_ONLY diagnostic toward Preferred ESM path

Status: open
Blocked by: None

## What to build

Rewrite the `RSELECTRON_IMPORT_ONLY_EXTERNAL` diagnostic message so Preferred ESM path guidance comes first (switch to `format: 'esm'` or `auto` under `"type": "module"` / remove forced `format: 'cjs'`), then `externalizeDeps.include` for intentional CJS. Keep the same diagnostic code and trigger conditions.

## Acceptance criteria

- [ ] Message still uses code `RSELECTRON_IMPORT_ONLY_EXTERNAL` and names the request
- [ ] Message (or unit-asserted phrases) puts ESM / `format: 'esm'` (or `auto` / remove `format: 'cjs'`) before `externalizeDeps.include` / `include`
- [ ] Existing import-only trigger tests remain green (CJS warns; include suppresses; ESM does not warn)
- [ ] Coverage extends `tests/unit/externalize.test.ts`; oxlint/format clean for touched files
