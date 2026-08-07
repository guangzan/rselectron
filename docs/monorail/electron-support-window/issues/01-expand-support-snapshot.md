# 01 — Expand Electron support snapshot to majors 28–43

Status: done
Blocked by: None

## What to build

Widen the frozen support window in `packages/core/src/electron/snapshot.ts` from majors 41–43 to **28–43**:

- Add `ELECTRON_SUPPORT_SNAPSHOT.byMajor` entries for majors 28–40 using the verified first-stable-release table in `spec.md` (chrome / node / `firstStable`; `esm: true` for every entry — 28+ is the ESM era).
- Update `majors` to the full `[28 … 43]` list and `peerRange` to `'>=28 <44'`.
- Update the "Frozen at …" comment to state the new window (floor 28, top = latest three stable majors at release time, frozen per release — wording consistent with CONTEXT.md / ADR 0011).

No runtime logic changes: `getSupportedMajor`, `electronChromeBrowserslist` (existing `Math.min(M, 138)` clamp) and `electronRspackTarget` already handle the new entries unchanged.

Update the snapshot-shape and clamp assertions in `tests/unit/electron-runtime.test.ts`:

- `majors` toEqual `[28, 29, …, 43]`; `peerRange` toBe `'>=28 <44'`.
- Spot-check `byMajor[28]` (chrome `120.0.6099.56`, node `18.18.2`, firstStable `28.0.0`, esm true) and `byMajor[37]` (chrome `138.0.7204.35`).
- Assert every 28–43 entry has `esm === true`.
- Clamp: `electronChromeBrowserslist(28)` → `'chrome >= 120'` (exact, below ceiling), `electronChromeBrowserslist(37)` → `'chrome >= 138'` (at ceiling), `electronChromeBrowserslist(43)` → `'chrome >= 138'` (clamped); update the existing 41/43 clamp assertions accordingly.

## Acceptance criteria

- [x] `ELECTRON_SUPPORT_SNAPSHOT.byMajor` contains all 16 majors 28–43 with metadata matching the spec table exactly (cross-checked against `releases.electronjs.org/releases.json` first-stable extraction).
- [x] `majors` is `[28, 29, …, 43]` and `peerRange` is `'>=28 <44'`.
- [x] Every entry 28–43 has `esm: true`.
- [x] `electronChromeBrowserslist` returns exact `chrome >= 120` for 28, `chrome >= 138` for 37 (ceiling), clamped `chrome >= 138` for 43.
- [x] Snapshot-shape and clamp unit tests in `electron-runtime.test.ts` pass.

## Comments

- Scout found two fixture consequences of the data change, folded into this issue to keep the suite green: (1) `electron-runtime.test.ts` "unsupported Electron majors" fixture `40.0.0` → `27.0.0` (40 became supported; below-floor bound now exercised); (2) `ci-workflow.test.ts` serialization assertion rewritten formatting-agnostically (regex-parse of the `majors:` array) and asserted to the full 28–43 list — the CI matrix regexes (`"41.` / `"43.`) intentionally stay for issue 03.
- Verified: `pnpm run test:unit` (17 files / 87 tests), `pnpm run typecheck` (0 errors), `pnpm run lint` (0 errors), `pnpm exec prettier --check` on touched files, `pnpm run build` all pass. TDD red → green at the agreed seams.
