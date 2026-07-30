# electron-vite 6.0.0 matrix delta review

- Status: Provisional freeze (awaiting `electron-vite@6.0.0` final)
- Date: 2026-07-25
- Related: `docs/monorail/compatibility-matrix.md`, RELEASE-003, parent #1 / slice #21

## Scope

Rselectron 1.0 freezes the compatibility matrix against the last published
electron-vite 6 line available at review time: **`6.0.0-beta.1`**.

`electron-vite@6.0.0` final is **not published** on npm at the time of this
review (`npm view electron-vite versions` tops out at `6.0.0-beta.1`). This
document records that fact explicitly so the freeze is not mistaken for a
silent rewrite of accepted Rselectron decisions.

## Review method

1. Diff public contracts documented for electron-vite 6.0.0-beta.1 against
   `docs/monorail/compatibility-matrix.md`.
2. Confirm every Target / Replacement / Extension row links automated or
   published evidence (Partial with linked tests/docs is allowed; bare
   `Pending` is not).
3. Confirm every Exception / Out-of-scope row links bilingual website docs.
4. Leave room to **add** rows after `6.0.0` final ships; do **not** silently
   change accepted Rselectron classifications without an ADR.

## Outcome

| Topic                    | Result                                     |
| ------------------------ | ------------------------------------------ |
| Baseline pin             | `electron-vite@6.0.0-beta.1` (provisional) |
| Final delta              | **Deferred** until `6.0.0` GA is published |
| Matrix freeze for 1.0 RC | Yes — current rows + evidence links        |
| Silent decision rewrites | None                                       |

## Follow-up when 6.0.0 final ships

1. Re-run capability inventory against the final changelog / docs.
2. Add matrix rows only for newly documented baseline behaviors.
3. Re-measure RELEASE-003 fixtures with the final electron-vite package when
   installable; keep regression checks ratio-based (no fixed marketing
   multiplier).
4. Update this document’s status from Provisional to Final.

## Bilingual pointers

- EN: `website/docs/en/guide/compatibility.md`, `website/docs/en/guide/migration.md`
- ZH: `website/docs/zh/guide/compatibility.md`, `website/docs/zh/guide/migration.md`
- ADR: `docs/monorail/adr/0001-capability-parity-not-drop-in-compatibility.md` and
  `docs/monorail/adr/zh/0001-capability-parity-not-drop-in-compatibility.md`
