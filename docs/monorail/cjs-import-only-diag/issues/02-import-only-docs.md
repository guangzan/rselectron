# 02 — Docs for import-only CJS external failure

Status: done
Blocked by: 01

## What to build

Document the CJS + import-only external failure mode in English and Chinese troubleshooting and `externalizeDeps` config pages. Align the narrative with electron-vite’s `ERR_REQUIRE_ESM` / ESM-only guidance, map the bundle escape to Rselectron’s `include` (call out electron-vite’s inverted `exclude`), and reference the diagnostic code from issue 01. Keep `webpackIgnore` as an advanced footnote only.

## Acceptance criteria

- [x] Troubleshooting (en + zh) describes symptoms, primary fixes (`include`, ESM format), and the diagnostic code
- [x] `externalizeDeps` config docs (en + zh) mention this failure pattern and the `include` escape without contradicting existing `execa`-style examples
- [x] `tests/docs/docs-site.test.ts` asserts the troubleshooting / config copy anchors (code and/or distinctive phrases)
- [x] No claim that the framework auto-includes import-only packages or silences warnings for magic-comment escapes
