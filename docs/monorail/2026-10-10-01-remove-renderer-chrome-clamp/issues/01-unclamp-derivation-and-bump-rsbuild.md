# 01 — Unclamp the Renderer derivation and bump the tested Rsbuild version

Status: done
Blocked by: None
Seams: `tests/unit/electron-runtime.test.ts` (derived-target anchor), `tests/unit/rsbuild-window.test.ts` (tested-window anchor)
Touchpoints: `packages/core/src/electron/snapshot.ts`, `packages/core/src/rsbuild/window.ts`, `package.json`, `pnpm-lock.yaml`, `tests/unit/electron-runtime.test.ts`, `tests/unit/inspect.test.ts`, `tests/unit/rsbuild-window.test.ts`, `tests/unit/benchmark-report.test.ts`

## What to build

Derive the Renderer compiler target from the true snapshot Chromium major: `electronChromeBrowserslist(major)` returns `chrome >= ${M}` with no `Math.min`, and the `BROWSERSLIST_CHROME_MAJOR_CEILING` constant is deleted. Move the workspace `@rsbuild/core` devDependency from `2.1.7` to `2.1.13` (same 2.1.x minor line, binding `~2.1.10`) so the pinned binding resolves the full current snapshot range, and set `RSBUILD_TESTED_WINDOW.tested` to `2.1.13`. Regenerate the lockfile.

Red first: update `electron-runtime.test.ts` to expect true majors (37 → `chrome >= 138`, 41 → `chrome >= 146`, 43 → `chrome >= 150`) and rename the clamp test title; update the normalize/build Renderer expectations (fake `43.0.0` → `chrome >= 150`); update `inspect.test.ts` (fake `41.0.0` → `chrome >= 146`); update `rsbuild-window.test.ts` `TESTED` to `2.1.13`; update the `benchmark-report.test.ts` fixture to `2.1.13`. Then make the code and dependency changes to go green.

## Acceptance criteria

- [x] `electronChromeBrowserslist` returns `chrome >= ${M}` for majors 28–43 (e.g. 28 → `120`, 37 → `138`, 41 → `146`, 43 → `150`); no clamp remains
- [x] `BROWSERSLIST_CHROME_MAJOR_CEILING` is deleted and no longer referenced anywhere
- [x] Renderer default path still writes only `output.overrideBrowserslist` and leaves `tools.rspack.target` unset; Main/Preload stay `electron${N}-main` / `electron${N}-preload`
- [x] Root `devDependencies["@rsbuild/core"]` is `2.1.13`; `RSBUILD_TESTED_WINDOW.tested` is `2.1.13`; `pnpm-lock.yaml` resolves the new Rsbuild/Rspack binding
- [x] `tests/unit/electron-runtime.test.ts`, `tests/unit/inspect.test.ts`, `tests/unit/rsbuild-window.test.ts`, `tests/unit/release-candidate.test.ts`, `tests/unit/renderer-advanced.test.ts` are green
- [x] `pnpm typecheck` is green

## Comments

Run 2026-10-10: start — main @ ff23a67

done — working tree (pending commit)

- seams used: `tests/unit/electron-runtime.test.ts`, `tests/unit/rsbuild-window.test.ts`
- typecheck: green (`rslint --type-check-only .`, 0 errors / 92 files)
- relevant tests: green (`rstest tests/unit`, 99 passed)
- acceptance criteria: met
