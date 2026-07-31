# 01 — CJS import-only external warning

Status: done
Blocked by: None

## What to build

When Main or Preload builds as CJS and Rspack CommonJS-externalizes a request that the pragmatic heuristic marks as import-only (including subpaths), emit a structured `Diagnostic` warning on the build result naming the request and pointing authors to `externalizeDeps.include` or `format: 'esm'`. Collect warnings from the CJS externals path into the existing `BuildResult.warnings` pipeline. Do not change default externalization or block the build.

## Acceptance criteria

- [x] New stable `RSELECTRON_*` code on `Diagnostic`; CJS Main (and Preload) fixtures with a fake import-only package and a subpath assert that code and the request appear in `result.warnings`
- [x] After `externalizeDeps.include` for that package, no warning; ESM roles do not warn for the same dependency
- [x] Always-external `electron` / Node builtins never trigger this warning
- [x] Unit coverage lives in `tests/unit/externalize.test.ts` (extend existing seam); oxlint/format clean for touched files
