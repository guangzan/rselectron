# 03 — CI matrix: exercise Electron 28.3.3 as the floor leg

Status: done
Blocked by: 01

## What to build

Make the floor of the window real in CI:

- `.github/workflows/ci.yml`: in the main-branch `fromJSON` matrix, replace the `"electron":"41.0.0","pin":true` leg with `"electron":"28.3.3","pin":true` (latest maintained 28.x, verified). The existing `pin` step (`pnpm add -wD electron@${{ matrix.electron }}`) and `node ./node_modules/electron/install.js` handle the rest unchanged. PR job and the three 43.2.0 legs stay untouched. Update the inline comment (`3 OS × 43 + ubuntu × 28`).
- `tests/unit/ci-workflow.test.ts`: update assertions — workflow must match `"electron"\s*:\s*"28\.` (floor) and still `"43\.` (top); update the snapshot serialization assertion from `majors: [41, 42, 43]` to `majors: [28, …, 43]`.

This leg is the real old-runtime verification: the Playwright e2e suite (`e2e/electron-smoke.spec.ts`) launches whatever Electron the matrix installs.

## Acceptance criteria

- [x] Main-branch CI matrix runs Electron `28.3.3` (pin) + `43.2.0` on 3 OS legs; PR job unchanged.
- [x] `ci-workflow.test.ts` passes with the new floor/top regexes and full majors serialization.
- [x] e2e suite passes on the 28.3.3 ubuntu leg when CI runs (locally: `pnpm add -wD electron@28.3.3 && node ./node_modules/electron/install.js && pnpm e2e` or the repo's e2e script).

## Comments

Built via TDD (rail/build/esw-03 worktree):

- `.github/workflows/ci.yml`: main-branch `fromJSON` matrix leg `"electron":"41.0.0","pin":true` → `"electron":"28.3.3","pin":true`; inline comment now reads `main: 3 OS × 43 + ubuntu × 28`. PR job and the three `43.2.0` legs untouched. The existing `pnpm add -wD electron@${{ matrix.electron }}` + `node ./node_modules/electron/install.js` pin steps are unchanged.
- `tests/unit/ci-workflow.test.ts`: both `"41\.` regex references (cross-platform evidence gates test, snapshot-bounds test) → `"28\.`; stale `41`/`41.0.0` comments updated. The formatting-agnostic majors serialization assertion (`[28 … 43]`) from the base commit was left untouched. The `not "40\.` / `not "44\.` assertions remain valid.
- TDD loop: after the assertion update, `pnpm exec rstest tests/unit/ci-workflow.test.ts` went RED (both `"28\.` matches failed) and GREEN after the ci.yml edit.
- Gates in worktree: `pnpm run test:unit` — 17 files / 87 tests passed (one run had a transient `build.test.ts` failure under parallel load; isolated run and full re-run both green); `pnpm run typecheck` — 0 errors; `pnpm run lint` — 0 errors; prettier clean on all touched files (ci.yml included in prettier coverage).
- E2E: lockfile Electron (43.2.0) is installed in the worktree, so `pnpm run test:e2e` was run as a local sanity check — `e2e/electron-smoke.spec.ts` passed (1/1). The Electron 28.3.3 leg itself is the CI verification surface (matrix pin + install.js); 28.3.3 was not downloaded/pinned locally per build instructions.
