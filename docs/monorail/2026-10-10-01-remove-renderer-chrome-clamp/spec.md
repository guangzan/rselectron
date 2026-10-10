# Spec: remove the Renderer Chromium clamp

## Problem Statement

The Renderer compiler target is derived as `output.overrideBrowserslist: ['chrome >= ${min(M, 138)}']`, where `M` is the Chromium major from the Electron support snapshot and `138` is a temporary clamp for `@rspack/binding`'s browserslist-rs data ceiling. Because the snapshot records Chromium `146`–`150` for the current Electron majors, every supported project actually gets `chrome >= 138` — the clamp hides the real target and under-specifies the Renderer build.

ADR 0010 recorded the removal as a follow-up conditional on browserslist-rs covering snapshot Chromium majors. That condition now holds: upstream [browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48) closed on 2026-08-01, and the data has shipped in `@rspack/binding`. Measured on this machine:

- `@rspack/binding@2.1.5` (the version the workspace pins today via `@rsbuild/core@2.1.7`) still fails `chrome >= 139`.
- `@rspack/binding@2.1.9`+ resolves `chrome >= 140`–`150`; `chrome >= 151` still fails.

So the clamp cannot be removed without also bumping the workspace `@rsbuild/core` devDependency. That bump can stay inside the 2.1.x minor line (`@rsbuild/core@2.1.11+` → `@rspack/core ~2.1.9`; `2.1.13` → `~2.1.10`), so the frozen Rsbuild tested window and the `^2.0.0` peer contract do not change.

## Solution

Delete the clamp and derive the exact snapshot Chromium major. Bump the workspace `@rsbuild/core` devDependency from `2.1.7` to `2.1.13` (same 2.1.x minor line) so the pinned binding resolves the full current snapshot range, and bump `RSBUILD_TESTED_WINDOW.tested` to match. Update all clamp-specific test expectations, the domain glossary, ADR 0010/0011, the compatibility-matrix BUILD-003 / BUILD-005 evidence, and the website troubleshooting page.

`electronChromeBrowserslist(major)` becomes `chrome >= ${M}` with no `Math.min`; `BROWSERSLIST_CHROME_MAJOR_CEILING` is deleted. The constant is not on the public export surface, so no public API changes.

## User Stories

1. As an app author on a supported Electron major, I want the derived Renderer target to name the real Chromium major, so that the compiler target reflects the runtime the app actually ships against.
2. As a maintainer, I want the temporary clamp gone once the upstream data allows it, so that ADR 0010's recorded follow-up is closed rather than left as stale debt.
3. As a maintainer, I want the workspace `@rsbuild/core` devDependency and `RSBUILD_TESTED_WINDOW.tested` to move together inside one minor line, so that the tested window and peer contract stay unchanged.
4. As a docs reader, I want the glossary, ADRs, matrix evidence, and troubleshooting page to describe the unclamped derivation, so that no page still claims a `138` ceiling that no longer exists.

## Implementation Decisions

- **Derivation:** `packages/core/src/electron/snapshot.ts` — `electronChromeBrowserslist(major)` returns `chrome >= ${String(chromeMajor)}` directly. Remove the `Math.min(chromeMajor, BROWSERSLIST_CHROME_MAJOR_CEILING)` line and delete the exported `BROWSERSLIST_CHROME_MAJOR_CEILING` constant plus its doc comment. Keep the existing "no snapshot entry" / "invalid Chromium version" throws unchanged.
- **Consumers unchanged:** `applyElectronTarget` in `packages/core/src/electron/runtime.ts` already writes `electronChromeBrowserslist(major)` into `output.overrideBrowserslist` and leaves `tools.rspack.target` unset for Renderer; Main/Preload keep `electron${N}-main` / `electron${N}-preload`. No runtime-control-flow change.
- **Release metadata:** root `package.json` `devDependencies["@rsbuild/core"]` `2.1.7` → `2.1.13`; `packages/core/src/rsbuild/window.ts` `RSBUILD_TESTED_WINDOW.tested` `'2.1.7'` → `'2.1.13'`. The `release-candidate` sync test then holds; the window stays `>=2.1.0 <2.2.0`.
- **Lockfile:** regenerate via `pnpm install` so `pnpm-lock.yaml` pins `@rsbuild/core@2.1.13` and `@rspack/core@~2.1.10` / `@rspack/binding@2.1.10` (or newer 2.1.x resolution).
- **Docs / domain:** `CONTEXT.md` + `CONTEXT.zh.md` `Derived compiler target` — state `chrome >= ${M}` and drop the `K` ceiling wording. `adr/0010` (en + zh) — the clamp rows become the unclamped rule and the "Temporary clamp and removal" section records that removal landed; `adr/0011` (en + zh) — its clamp sentences update. `compatibility-matrix.md` BUILD-003 / BUILD-005 evidence — replace `['chrome >= ${min(M, 138)}']` / `['chrome >= 138']` with the true-major wording. `website/docs/{en,zh}/guide/troubleshooting.md` — drop the clamp / #48 sentence, keep the `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK` and `tools.rspack.target: 'web'` guidance.

## Testing Decisions

External behaviour under test: the derived Renderer compiler target for a project-local Electron major, and the tested-window sync. No Electron GUI.

**Seams (confirmed):**

1. **`tests/unit/electron-runtime.test.ts`** — the anchor for derived targets. Update the helper test to expect true majors (major 37 → `chrome >= 138`, 41 → `chrome >= 146`, 43 → `chrome >= 150`; rename the "clamps at K=138" title), and update the two normalize/build Renderer expectations (`chrome >= 138` → `chrome >= 150` for fake Electron `43.0.0`; the 41-based derivation case → `chrome >= 146`). Keep the "leaves rspack target unset" assertions.
2. **`tests/unit/inspect.test.ts`** — the fake Electron `41.0.0` fixture asserts `overrideBrowserslist`; update `['chrome >= 138']` → `['chrome >= 146']`.
3. **`tests/unit/rsbuild-window.test.ts`** — `TESTED` fixture `2.1.7` → `2.1.13`; the `checkRsbuildWindow` self-check asserts `RSBUILD_TESTED_WINDOW.tested === '2.1.13'` (repo's own copy) and stays warning-free.
4. **`tests/unit/release-candidate.test.ts`** — unchanged assertions; they now compare `2.1.13` against the bumped devDependency. `tests/unit/benchmark-report.test.ts` fixture `'@rsbuild/core': '2.1.7'` → `'2.1.13'` (fixture-only, keeps data plausible).
5. **`tests/unit/renderer-advanced.test.ts`** — uses fake Electron `28.0.0`, so its `['chrome >= 120']` expectation is already the true major and needs no change; confirm it stays green (the point of the effort is that majors below the old clamp are unaffected).

**Prior art:** the existing derive/normalize assertions in `electron-runtime.test.ts` are exactly the seam; no new test infrastructure. A full Renderer `build()` with the unclamped target already runs in the integration suite and proves the binding accepts `chrome >= 150`.

## Out of Scope

- Changing the `@rsbuild/core` peer range (`^2.0.0`) or crossing the 2.1.x minor line.
- Main/Preload target derivation.
- A first-class `nodeIntegration` config flag.
- Runtime `@rspack/binding` version probing with clamp fallback (align option B, rejected).
- Re-litigating the sandbox `global` fix or the Electron support window.

## Further Notes

- **Known risk, recorded:** the current snapshot top is Chromium `150`; binding `2.1.10` still fails `chrome >= 151`. When Electron 44+ (Chromium ≥ 152) enters the support window, the binding will need another bump or a re-introduced guard. This effort adds no binding-version probe.
- **Accepted consequence:** an app on an old `@rsbuild/core` (binding < 2.1.9) building Renderer under Electron 38+ now hits a browserslist parse failure. The same-minor patch bump fixes it; the warn-only `RSELECTRON_RSBUILD_UNTESTED` diagnostic already names the tested window.
- Align: `docs/monorail/2026-10-10-01-remove-renderer-chrome-clamp/align.md`
- ADR: `docs/monorail/adr/0010-renderer-chrome-compiler-target.md` (en + zh)
- Upstream: https://github.com/browserslist/browserslist-rs/issues/48 (closed 2026-08-01)
