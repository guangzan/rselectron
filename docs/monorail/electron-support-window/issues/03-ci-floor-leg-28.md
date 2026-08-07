# 03 — CI matrix: exercise Electron 28.3.3 as the floor leg

Status: claimed
Blocked by: 01

## What to build

Make the floor of the window real in CI:

- `.github/workflows/ci.yml`: in the main-branch `fromJSON` matrix, replace the `"electron":"41.0.0","pin":true` leg with `"electron":"28.3.3","pin":true` (latest maintained 28.x, verified). The existing `pin` step (`pnpm add -wD electron@${{ matrix.electron }}`) and `node ./node_modules/electron/install.js` handle the rest unchanged. PR job and the three 43.2.0 legs stay untouched. Update the inline comment (`3 OS × 43 + ubuntu × 28`).
- `tests/unit/ci-workflow.test.ts`: update assertions — workflow must match `"electron"\s*:\s*"28\.` (floor) and still `"43\.` (top); update the snapshot serialization assertion from `majors: [41, 42, 43]` to `majors: [28, …, 43]`.

This leg is the real old-runtime verification: the Playwright e2e suite (`e2e/electron-smoke.spec.ts`) launches whatever Electron the matrix installs.

## Acceptance criteria

- [ ] Main-branch CI matrix runs Electron `28.3.3` (pin) + `43.2.0` on 3 OS legs; PR job unchanged.
- [ ] `ci-workflow.test.ts` passes with the new floor/top regexes and full majors serialization.
- [ ] e2e suite passes on the 28.3.3 ubuntu leg when CI runs (locally: `pnpm add -wD electron@28.3.3 && node ./node_modules/electron/install.js && pnpm e2e` or the repo's e2e script).
