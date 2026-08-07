# Align: Electron support window 28–43

## Intent

Widen Rselectron's supported Electron major window from the current frozen 41–43 down to **28–43**, so projects pinned to older Electron majors (the ESM era, Electron 28+) can use Rselectron without a hard `RSELECTRON_ELECTRON_UNSUPPORTED` rejection. Motivation came from comparing against the electron-vite baseline, which effectively supports Electron 22+ (per-major Node/Chrome tables for 22–41 plus a silent fallback) with no hard version errors.

The frozen-snapshot mechanism, per-major metadata, and hard error for out-of-window versions are all retained — only the window and the "three stable majors" convention change.

## Decisions settled

- **Direction**: widen downward only. The upper edge keeps rolling with releases (next release naturally becomes 28–44).
- **Floor**: Electron 28. Every major in 28–43 supports ESM (`esm: true` for all 16 entries); below 28 remains a hard `RSELECTRON_ELECTRON_UNSUPPORTED` error — no best-effort fallback, no warning tier.
- **Window for this release**: 28–43 (16 majors). Snapshot stays frozen per release with the top three majors convention replaced by "floor 28 fixed, top = latest three stable at release time".
- **Peer range**: `>=28 <44` in the public facade's optional peerDependencies.
- **Metadata**: fill `ELECTRON_SUPPORT_SNAPSHOT.byMajor` entries 28–40 (41–43 already exist) from Electron official first-stable release metadata (chrome / node / firstStable, `esm: true`).
- **Renderer browserslist**: no code change needed — existing `Math.min(M, 138)` clamp yields exact `chrome >= M` for majors 28–36 (M < 138), `chrome >= 138` at major 37 (Chromium 138), and clamped `chrome >= 138` for 38+.
- **Main/Preload targets**: unchanged `electron${N}-main` / `electron${N}-preload`. Rspack's acceptance of `electron28-main`-style target strings for old majors must be verified during spec/implementation (Rspack is a Rust binding; webpack's target grammar suggests arbitrary majors are accepted, but this is unverified).
- **CI**: main-branch matrix switches the oldest sample from Electron 41.0.0 to **28.x** (latest maintained 28 release), keeping 43.2.0 as the newest — "oldest + newest endpoints" convention retained. PR job unchanged (43.2.0).
- **Domain/docs updates in scope**: CONTEXT.md / CONTEXT.zh.md "Electron support snapshot" definition, ADR 0005 snapshot paragraph (via new ADR 0011), compatibility-matrix ELECTRON-002 contract + evidence, website en/zh `guide/compatibility.md`, `tests/unit/release-candidate.test.ts` (peer range + `41–43` doc assertions), `tests/unit/ci-workflow.test.ts` (CI matrix assertion), plus any unit tests hardcoding majors 41/43.

## Deferred

- **Rspack old-major target verification**: whether `electron28-main` etc. resolve in the pinned `@rspack/binding` — a spec/implementation-time check, not an align decision.
- **Window below 28**: rejected — stays hard error (user chose 28 as floor, not the baseline's silent-fallback model).
- **browserslist-rs clamp removal** (tracked upstream browserslist-rs#48): unchanged; still pending upstream, affects only majors 38+ in the new window.
- **electron-vite-style silent fallback / threshold-based capability checks**: explicitly rejected; frozen per-major metadata remains the model.

## Out of scope

- Dynamic or warning-tier support for out-of-window majors (ADR 0005's rejected alternatives stay rejected).
- Supporting majors below 28 (pre-ESM, CJS-only era).
- Peer range widening beyond `>=28 <44` (e.g. accepting arbitrary newer majors ahead of the next release).
- e2e examples/playgrounds for old majors; CI endpoint coverage (28 + 43) is the verification surface.

## Domain pointers

- Glossary: [Electron support snapshot](../../CONTEXT.md) (and [CONTEXT.zh.md](../../CONTEXT.zh.md)) — definition updated to the frozen floor-window model.
- ADR: [0011-electron-support-window.md](../../adr/0011-electron-support-window.md) (new) amends [0005-electron-is-an-optional-project-peer.md](../../adr/0005-electron-is-an-optional-project-peer.md) snapshot paragraph.
- Acceptance record: [compatibility-matrix.md](../../compatibility-matrix.md) — ELECTRON-002 contract/evidence updated.
