# 02 — Docs and examples for out/<role> default

Status: done
Blocked by: 01

## What to build

Update getting-started (en + zh) so the Electron entry section teaches `out/<role>` as the unset default (not `src/main/dist`). Add a short migration / getting-started note that early beta unset `root/dist` behaviour is replaced. Point learning examples’ `package.json#main` at the planned Main output under Conventional role outputs + entry filename policy. Optionally note BUILD-001 matrix evidence for preset injection (zero-config discovery still deferred).

## Acceptance criteria

- [x] Getting-started en + zh describe `out/main` (or `out/<role>`) as the default unset layout and no longer present `src/main/dist` as that default
- [x] Migration (en + zh) or getting-started mentions the beta default change / how to keep an explicit `distPath: 'dist'` layout
- [x] `examples/vanilla` and `examples/react` declare `package.json#main` aligned with planned Main output under `out/main`
- [x] `tests/docs/docs-site.test.ts` asserts the getting-started default-layout copy anchors
- [x] BUILD-001 evidence updated to credit preset injection while leaving zero-config-without-config as deferred/Partial if still accurate

## Comments

- 2026-08-01: Docs, examples, matrix evidence, and docs-site asserts landed.
