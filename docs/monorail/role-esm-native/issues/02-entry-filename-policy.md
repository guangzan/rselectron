# 02 — Entry filename policy for role module format

Status: done
Blocked by: 01

## What to build

When Main/Preload do not set `output.filename`, apply the entry filename policy: ESM → `[name].mjs`; CJS + application `"type": "module"` → `[name].cjs`; otherwise `[name].js`. Explicit `filename` always wins. Fix planned Main entry resolution so it no longer assumes `[name].js` when the policy would choose another extension. Emit a structured warning (build continues) for dangerous explicit overrides (ESM or CJS+`type:module` forced to `.js`). Keep existing entry↔manifest mismatch severity (`dev`/`preview` error, `build` warning).

## Acceptance criteria

- [x] Unset filename + ESM produces `[name].mjs` for Main and Preload entries
- [x] Unset filename + CJS + `"type": "module"` produces `[name].cjs`
- [x] Unset filename + CJS without `"type": "module"` remains `[name].js`
- [x] Explicit `output.filename` overrides the policy
- [x] Planned Main entry used for manifest comparison matches the policy extension
- [x] Dangerous explicit `.js` overrides emit a structured warning and still build
- [x] Runtime/entry unit tests cover the matrix above and pass

## Comments

- 2026-07-30: Claimed + implemented. `normalizeRuntime` applies Entry filename policy via `defaultEntryFilenamePattern`; dangerous `.js` overrides emit `RSELECTRON_ENTRY_FILENAME_RISK`; `plannedMainEntry` reads normalized filename. Unit + typecheck + full `rstest` green.
