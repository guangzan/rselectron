# 01 — Inject conventional out/<role> distPath

Status: done
Blocked by: None

## What to build

In `normalizeRuntime`, apply Conventional role outputs: when a Role’s `output.distPath` is unset or is an object without a usable `root`, set `output.distPath.root` to `resolve(appRoot, 'out', role)`. Preserve explicit string `distPath` and objects that already set `root`. Keep sibling `distPath` fields when injecting into an object missing `root`. Ensure `plannedMainEntry` / `roleDistRoot` consumers (already post-normalize) observe the injected path.

## Acceptance criteria

- [x] Unset three-role `normalizeRuntime` fixture: each Role’s `distPath.root` is `join(appRoot, 'out', role)` (absolute)
- [x] Explicit string `distPath` and object-with-`root` are unchanged; object without `root` receives injection
- [x] `plannedMainEntry` for an unset Main config (after normalize) resolves under `out/main/` with the entry filename policy
- [x] Coverage lives in `tests/unit/electron-runtime.test.ts` (extend existing seam); oxlint/format clean for touched files

## Comments

- 2026-08-01: Claimed + implemented. `applyConventionalDistPath` in `normalizeRuntime`; unit tests green.
