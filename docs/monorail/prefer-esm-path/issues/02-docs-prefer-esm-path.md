# 02 — Docs: Preferred ESM path and drop CJS workarounds

Status: done
Blocked by: 01

## What to build

Update troubleshooting, config (`externalizeDeps` / `format` as needed), and migration pages (en + zh) so Preferred ESM path is the primary recommendation for import-only / `"type": "module"` interop. Document dropping beta workarounds: forced `format: 'cjs'`, include lists added only for import-only packages, and default `webpackIgnore` interop. Keep `include` as the intentional-CJS escape; keep bundler-ignore as an advanced footnote that should be removed once on ESM. Align docs-site asserts with the new order.

## Acceptance criteria

- [x] Troubleshooting (en + zh) lists ESM / Preferred ESM path before `externalizeDeps.include`; `webpackIgnore` is not a primary fix
- [x] Config pages that restate the cure match that order; `format: 'cjs'` examples are not framed as the fix for ESM-only deps
- [x] Migration (en + zh) has a checklist item (or equivalent) to drop forced `format: 'cjs'` / import-only-only includes / `webpackIgnore` default interop after upgrading
- [x] `tests/docs/docs-site.test.ts` asserts Preferred-ESM-first / workaround-drop copy anchors

## Comments

- 2026-08-01: Docs + docs-site order asserts landed.
