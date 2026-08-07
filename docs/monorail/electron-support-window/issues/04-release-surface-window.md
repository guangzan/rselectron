# 04 — Release surface: peer range, website docs, matrix record

Status: claimed
Blocked by: 01

## What to build

Align every published surface with the widened window:

- `packages/rselectron/package.json`: peerDependencies `electron` from `">=41 <44"` to `">=28 <44"` (optional peer meta unchanged).
- `website/docs/en/guide/compatibility.md` and `website/docs/zh/guide/compatibility.md`: replace the `41–43` / `>=41 <44` statements with `28–43` / `>=28 <44`, phrased consistently with the frozen-window wording in CONTEXT.md / ADR 0011 (floor 28 fixed, top = three stable majors at release, rolls per release).
- `docs/monorail/compatibility-matrix.md` ELECTRON-002: update contract (frozen window floor 28 + rolling top, not "three stable majors") and evidence (majors 28–43; CI majors 28 and 43).
- `tests/unit/release-candidate.test.ts`: update the peerDependencies assertion to `'>=28 <44'` and the en/zh docs assertions from `41–43` to `28–43`.
- README.md / README.zh.md / `packages/rselectron/README.md`: update only if they mention the range (grep shows none today — verify again during implementation).

## Acceptance criteria

- [ ] Published peer range is `>=28 <44`; `release-candidate.test.ts` peer assertion passes against the packed tarball.
- [ ] en/zh website compatibility guides state the 28–43 window and `>=28 <44` peer range; `release-candidate.test.ts` doc assertions pass.
- [ ] `compatibility-matrix.md` ELECTRON-002 contract/evidence reflect the floor-28 window and CI majors 28 + 43.
- [ ] `pnpm docs:build` (or the repo's docs build script) succeeds.
