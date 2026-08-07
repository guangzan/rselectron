# 04 — Release surface: peer range, website docs, matrix record

Status: done
Blocked by: 01

## What to build

Align every published surface with the widened window:

- `packages/rselectron/package.json`: peerDependencies `electron` from `">=41 <44"` to `">=28 <44"` (optional peer meta unchanged).
- `website/docs/en/guide/compatibility.md` and `website/docs/zh/guide/compatibility.md`: replace the `41–43` / `>=41 <44` statements with `28–43` / `>=28 <44`, phrased consistently with the frozen-window wording in CONTEXT.md / ADR 0011 (floor 28 fixed, top = three stable majors at release, rolls per release).
- `docs/monorail/compatibility-matrix.md` ELECTRON-002: update contract (frozen window floor 28 + rolling top, not "three stable majors") and evidence (majors 28–43; CI majors 28 and 43).
- `tests/unit/release-candidate.test.ts`: update the peerDependencies assertion to `'>=28 <44'` and the en/zh docs assertions from `41–43` to `28–43`.
- README.md / README.zh.md / `packages/rselectron/README.md`: update only if they mention the range (grep shows none today — verify again during implementation).

## Acceptance criteria

- [x] Published peer range is `>=28 <44`; `release-candidate.test.ts` peer assertion passes against the packed tarball.
- [x] en/zh website compatibility guides state the 28–43 window and `>=28 <44` peer range; `release-candidate.test.ts` doc assertions pass.
- [x] `compatibility-matrix.md` ELECTRON-002 contract/evidence reflect the floor-28 window and CI majors 28 + 43.
- [x] `pnpm docs:build` (or the repo's docs build script) succeeds.

## Comments

- `packages/rselectron/package.json` peerDependencies `electron` widened `">=41 <44"` → `">=28 <44"`; `peerDependenciesMeta` (optional) and `@rsbuild/core` peer untouched.
- `website/docs/en|zh/guide/compatibility.md` rewritten to the frozen-window model (floor 28 fixed, top = three stable majors at release, today 43; window frozen per release) with `28–43` / `>=28 <44`. Also aligned the stale snapshot example in `website/docs/en|zh/api/javascript-api.md` (`{ majors: [41, 42, 43], peerRange: '>=41 <44' }` → `{ majors: [28, …, 43], peerRange: '>=28 <44' }`).
- `docs/monorail/compatibility-matrix.md` ELECTRON-002 Contract reworded to the floor-28 window model ("freeze an Electron support window per release — a fixed floor at Electron 28 and a rolling top at the three stable majors current at release time; reject versions outside the window") and Evidence updated to majors 28–43 with CI majors 28 and 43. Other matrix sections untouched (BUILD-003 / RELEASE-002 evidence quote test/CI fixtures owned by issues 02/03, not the window statement).
- `tests/unit/release-candidate.test.ts` peer assertion → `'>=28 <44'`, en/zh doc assertions → `'28–43'`. TDD: RED confirmed before source edits, GREEN after.
- Scout: `tests/integration/tarball-smoke.test.ts` and `tests/integration/package-managers.test.ts` assert the same packed-facade peer range and were stale — updated to `'>=28 <44'`; both pass against the packed tarball (npm/pnpm/yarn/bun legs).
- READMEs (`README.md`, `README.zh.md`, `packages/rselectron/README.md`): grep shows only generic Electron mentions, no range statement — left untouched per issue. `examples/*/package.json` declare `electron: ">=41 <44"` as a devDependency range (a subset of the widened peer; not a window statement) — left untouched, flagged for awareness.
- Verified in this worktree: `pnpm run test:unit` (17 files / 87 tests), `pnpm run test:docs` (12 tests), `pnpm run typecheck` (0 errors), `pnpm run lint` (0 errors), `pnpm exec prettier --check` on all touched files, `pnpm run docs:build` succeeds. One transient `build.test.ts` concurrency flake observed once under full-suite load; passes in isolation and on re-run.
