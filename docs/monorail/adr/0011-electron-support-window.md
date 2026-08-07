# 0011. Electron support window: floor 28, top rolls with releases

- Status: Accepted
- Date: 2026-08-07
- Amends: [0005-electron-is-an-optional-project-peer.md](./0005-electron-is-an-optional-project-peer.md)

## Context

ADR 0005 froze each Rselectron release to the **three stable Electron majors** supported at release time, with per-major metadata (Node, Chromium, ESM capability), CI on the oldest and newest majors, and a hard structured error for versions outside the snapshot. The snapshot recorded majors 41–43.

The electron-vite baseline (6.0.0-beta.1) is far more permissive: it declares no Electron peer, rejects no version, keeps per-major Node/Chromium tables for majors 22–41, and silently falls back to the oldest table values (`node16.17` / `chrome108`) for majors outside the table. Its capability checks are thresholds (`ESM >= 28`, `import.meta` paths `>= 30`). Projects pinned to older Electron majors therefore work with electron-vite but are hard-rejected by Rselectron.

Users want Rselectron usable for applications pinned to older but still ESM-capable Electron majors. Widening **downward** is safe: every major in the ESM era (28+) already supports ESM Main/Preload output, their Chromium majors are all at or below the browserslist-rs ceiling (138), and the historical release metadata is stable and one-time to record. Widening **upward** needs no design change — the snapshot top already rolls at each release.

The old "three stable majors" formulation conflated two different things: the **window floor** (which can be a fixed, documented constant) and the **window top** (which must roll with Electron's release cadence). Splitting them makes the floor a product decision rather than an accident of release timing.

## Decision

Each Rselectron release freezes an **Electron support window** instead of "the three stable majors":

- **Floor**: fixed at Electron **28** (the first ESM-capable major; below 28 remains hard-rejected with `RSELECTRON_ELECTRON_UNSUPPORTED`).
- **Top**: the three stable majors current at release time (today: 43), so the window rolls upward at each release.
- The window is frozen per release: release metadata, the optional peer range (`>=28 <44` today), documentation, and CI all use the same immutable window; it does not drift after publication.
- Every major in the window carries per-major metadata in `ELECTRON_SUPPORT_SNAPSHOT` (Node and Chromium from that major's first stable release, `esm` capability, first stable version string). No silent fallback and no threshold guessing: a project-local Electron outside the window still fails with a structured unsupported-version error.
- CI exercises the latest maintained release of the **floor major** (28.x) and the **top major** on every supported OS/arch combination where runners are available. Today that means the main-branch matrix runs Electron 28.x (replacing 41.0.0) and 43.2.0.
- Renderer Chromium derivation is unchanged: `chrome >= min(M, 138)` with the browserslist-rs clamp. For majors below the clamp (28–36) this yields the exact snapshot Chromium major — a behavior improvement for old majors, not a new mechanism.

This amends ADR 0005's snapshot paragraph: the "three stable majors" convention and its "Accept every Electron major above a minimum" rejection are re-interpreted. Rselectron still rejects majors without frozen per-major metadata and CI endpoint verification; the floor-28 window is not an unverified best-effort range. "Resolve the support window dynamically" remains rejected.

## Consequences

- Applications on Electron 28–43 are accepted; below 28 still fails with the structured unsupported-version error.
- `ELECTRON_SUPPORT_SNAPSHOT` grows from 3 to 16 entries (28–40 added); historical metadata is one-time, stable data.
- The public optional peer range becomes `>=28 <44`.
- Main-branch CI runs the e2e suite on Electron 28.x, which exercises the old runtime for real; old Electron on current CI runners carries some compatibility risk (accepted).
- Derived Renderer browserslist becomes exact (`chrome >= M`) for majors 28–36 instead of always `chrome >= 138`.
- `electron${N}-main` / `electron${N}-preload` targets are emitted for old majors; Rspack's acceptance of such target strings for majors below ~37 is to be verified in implementation (expected to follow webpack's target grammar).
- Docs, compatibility matrix (ELECTRON-002), release-candidate tests, and CI-workflow tests are updated to the new window.

## Alternatives considered

### Keep the three-stable-majors convention

Rejected: projects pinned to older majors stay hard-rejected while the baseline accepts them; the floor was an accident of release timing rather than a product decision.

### Mirror electron-vite: no window, silent fallback for unknown majors

Rejected: ADR 0005's frozen-metadata model exists precisely to avoid untested, unverifiable target facts; a silent fallback for unknown majors would reintroduce that risk (and for new majors would be actively wrong, as the baseline's fallback proves).

### Floor below 28

Rejected: majors below 28 are pre-ESM (CJS-only), adding a second capability regime for little practical benefit; the user chose the ESM-era floor.

### Warning tier instead of hard error for out-of-window majors

Rejected: out-of-window majors have no frozen metadata to derive targets from; a warning tier would silently guess or require target plumbing with no verification surface.
