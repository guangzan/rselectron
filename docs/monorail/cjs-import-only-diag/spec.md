# Spec: cjs-import-only-diag

## Problem Statement

Under a CJS Main/Preload role, format-aware externalization emits CommonJS externals (`` `commonjs ${request}` ``). When the request is an import-only package or subpath (no usable `require`/`default`/`main` CJS path), Rspack may rewrite static or dynamic `import` to `require`. The build succeeds; Electron fails only at runtime (`ERR_REQUIRE_ESM`, `is not a function`, etc.). Authors already have `externalizeDeps.include` and ESM format as escapes, but there is no build-time signal and troubleshooting does not spell out this CJS + import-only path (electron-vite documents the same class of failure as `ERR_REQUIRE_ESM`, with inverted include/exclude naming).

## Solution

Ship **Import-only external risk** coverage without changing default externalization:

1. **Structured warning** on CJS Main/Preload when an actual CommonJS-externalized request is judged import-only (pragmatic heuristic, including subpaths). Prefer messaging that points to `externalizeDeps.include` or `format: 'esm'`; mention bundler-ignore native `import()` only as an advanced footnote.
2. **Docs** — dual-write troubleshooting + `externalizeDeps` config pages, narrative-aligned with electron-vite’s ESM-only / `ERR_REQUIRE_ESM` guidance, with explicit key-name mapping (`include` = bundle in Rselectron; electron-vite’s `exclude` = same intent).
3. **Domain** — glossary term already added; ADR 0009 Consequences pointer already notes the tension; no new ADR.

## User Stories

1. As an app author on CJS Main who depends on an import-only package (or subpath), I want a build warning naming the request and the fix, so that I do not discover the break only after launch.
2. As an app author who already `include`s that package (or uses ESM Main), I want no spurious warning, so that the signal stays actionable.
3. As an app author reading docs, I want a troubleshooting entry and config note for this failure mode (with correct Rselectron key names), so that I can fix it without rediscovering the CJS/ESM interop trap.
4. As a maintainer, I want unit and docs-site asserts for the diagnostic and copy, so that the contract does not regress silently.

## Implementation Decisions

- **Contract authority:** Glossary *Import-only external risk*; ADR 0009 (CJS CommonJS externals retained; this effort diagnoses the known tension). Related: Format-aware externalization, Role module format.
- **When:** Main and Preload only; role format CJS; request is actually CommonJS-externalized (same predicate as today’s externals path). Skip always-external `electron` / Node builtins.
- **How collected:** During the CJS externals path, evaluate each externalized request (including subpaths); dedupe per role/build; merge into existing `BuildResult.warnings` / runtime warning aggregation (same `Diagnostic` shape). Do not block build for any mode.
- **Heuristic:** Resolve the request’s package entry/`exports` under the app root; treat as import-only when there is no usable CJS condition (`require` / `default` / classic `main`) and import-oriented signals dominate (`import` exports, `module`, `"type": "module"`). Prefer false positives with clear `include` guidance over silent misses. Exact helper may live beside externalization; keep it testable.
- **Code:** New `RSELECTRON_*` diagnostic code on `Diagnostic` (name TBD in implementation; stable once landed). Message includes the request string and primary escapes (`include`, `format: 'esm'`).
- **Docs (en + zh):** Troubleshooting section for this failure (symptoms + two primary fixes); strengthen `externalizeDeps` page with the same pattern and electron-vite key-name caveat. Do not elevate `webpackIgnore` to a first-class contract.
- **Non-goals in code:** No auto-`include`; no change to `` `commonjs ${request}` `` emission; no warning-suppress API beyond stopping externalization via `include`.

## Testing Decisions

External behaviour over implementation details. Confirmed seams:

1. **`tests/unit/externalize.test.ts`** — CJS Main/Preload fixtures with fake import-only packages (including a subpath); assert `result.warnings` contains the new code and request; after `externalizeDeps.include`, no warning; ESM roles do not warn for the same dependency.
2. **`tests/docs/docs-site.test.ts`** — troubleshooting mentions the failure mode / diagnostic code; electron config docs mention `include` as the bundle escape for this case (and remain consistent with existing `externalizeDeps` asserts).
3. **Plumbing:** Warnings from the CJS externals collection path must appear on `BuildResult.warnings` so seam 1 can assert without a parallel harness. No Electron real-load gate for this effort.

Prefer extending these seams; do not invent a parallel test stack.

## Out of Scope

- Auto-including import-only packages
- Preserving native dynamic `import()` by default under CJS externals
- Reversing ADR 0009’s CJS → CommonJS externals decision
- Perfect Node “can require?” simulation
- Warning ignore-list API
- Renderer behaviour; packaging tools
- Renaming `include`/`exclude` to match electron-vite
- Application-side consumer fixes (e.g. OpenCode runtime)

## Further Notes

- Behavioural doc reference: [electron-vite troubleshooting — ERR_REQUIRE_ESM](https://electron-vite.org/guide/troubleshooting) and dependency-handling `exclude` (bundle). Rselectron maps that escape to `include`.
- Prior effort (opposite direction): `docs/monorail/role-esm-native/`.
- Align source: `docs/monorail/cjs-import-only-diag/align.md`.
