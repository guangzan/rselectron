# Align: remove the Renderer Chromium clamp

## Intent

Finish the follow-up recorded in ADR 0010 and `renderer-chrome-target`: remove the temporary `K = 138` browserslist clamp so the derived Renderer compiler target is the true snapshot Chromium major (`chrome >= ${M}`) instead of `chrome >= ${min(M, 138)}`.

The blocker was upstream: `@rspack/binding`'s browserslist-rs could not resolve Chromium majors above ~138, so `chrome >= 146` (Electron 41+) resolved empty and failed the build. Upstream [browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48) is now closed (maintainer: the data was simply not updated), and the data has since shipped. Measured locally on this machine:

- `@rspack/binding@2.1.5` (what the repo pins today) still fails `chrome >= 139` — the clamp is still required for that copy.
- `@rspack/binding@2.1.9` and later resolve `chrome >= 146` / `148` / `150`; `chrome >= 151` still fails.

So removing the clamp requires bumping the workspace `@rsbuild/core` devDependency, and the current snapshot top (Electron 43 → Chromium `150`) fits inside the new binding's range.

## Decisions settled

- **Direction: remove the clamp outright** (not version-probe fallback, not a raised constant). This is the path ADR 0010 already committed to: "remove the clamp and use `chrome >= ${M}`" once the binding covers snapshot Chromium majors.
- **Version bump stays inside the 2.1.x minor line.** Workspace devDependency `@rsbuild/core` `2.1.7` → `2.1.13` (latest 2.1.x). `@rsbuild/core@2.1.11+` depends on `@rspack/core ~2.1.9`, and `2.1.13` on `~2.1.10`; binding `2.1.9`/`2.1.10` resolve the full current snapshot range (verified: `140`–`150`). Same minor line means the frozen **Rsbuild tested window stays `>=2.1.0 <2.2.0`** and the `^2.0.0` peer contract is unchanged.
- **Code:** `electronChromeBrowserslist(major)` returns `chrome >= ${M}` — drop the `Math.min(chromeMajor, BROWSERSLIST_CHROME_MAJOR_CEILING)` clamp and delete the `BROWSERSLIST_CHROME_MAJOR_CEILING` constant. It is not part of the public export surface (`packages/rselectron/src/index.ts` exports `ELECTRON_SUPPORT_SNAPSHOT` and `RSBUILD_TESTED_WINDOW`, but not the ceiling), so deleting it is not a breaking API change.
- **Release metadata:** bump `RSBUILD_TESTED_WINDOW.tested` to `2.1.13` in the same change as the devDependency, keeping the `release-candidate` sync assertion green.
- **Tests:** update every `chrome >= 138` expectation to the true major (e.g. major 37 → `chrome >= 138`, 41 → `chrome >= 146`, 43 → `chrome >= 150`); rename the clamp-specific test title.
- **Docs:** update the `Derived compiler target` glossary (en + zh), ADR 0010 (en + zh, including its "Temporary clamp and removal" section now being satisfied), ADR 0011's clamp sentences (en + zh), the compatibility-matrix BUILD-003 / BUILD-005 evidence, and the website troubleshooting page (en + zh).
- **Peer contract stays wide (`^2.0.0`)** per ADR 0012. Consequence, accepted: an application still on an old `@rsbuild/core` (binding < 2.1.9) that builds Renderer under Electron 38+ (Chromium 140+) will now hit a browserslist parse failure. The fix is the same-minor patch bump; the `RSELECTRON_RSBUILD_UNTESTED` warn-only diagnostic already names the tested window. Beta stage, no production users.

## Deferred

- **Future top roll re-touching the binding ceiling.** The current snapshot top is Chromium `150`; `chrome >= 151` still fails on binding `2.1.10`. When Electron 44+ (Chromium ≥ 152) enters the window, the binding will need another bump (or a re-introduced guard). Recorded as a known risk; this effort does not add binding-version probing.
- **Runtime binding-version probe with clamp fallback** (align option B): explicitly rejected — couples the framework to a binding internal version for a beta-stage edge case.

## Out of scope

- Narrowing or otherwise changing the `@rsbuild/core` peer range (stays `^2.0.0`).
- Main/Preload target derivation (`electron${N}-main` / `electron${N}-preload` unchanged).
- A first-class `nodeIntegration` config flag.
- Crossing the Rsbuild minor line (no `2.2.x` upgrade in this effort).
- Re-litigating `renderer-chrome-target`'s sandbox fix or the Electron support window itself.

## Domain pointers

- Glossary: `docs/monorail/CONTEXT.md` / `CONTEXT.zh.md` — `Derived compiler target`, `Electron support snapshot`, `Rsbuild tested window`.
- ADR: `docs/monorail/adr/0010-renderer-chrome-compiler-target.md` (en + zh) — this effort completes its "Temporary clamp and removal" clause. Related: `0011-electron-support-window.md`, `0012-rsbuild-remains-a-required-project-peer.md`.
- Prior efforts: `docs/monorail/renderer-chrome-target/` (the clamp's origin), `docs/monorail/electron-support-window/`, `docs/monorail/rsbuild-version-policy/`.
- Upstream: https://github.com/browserslist/browserslist-rs/issues/48 (closed 2026-08-01).
