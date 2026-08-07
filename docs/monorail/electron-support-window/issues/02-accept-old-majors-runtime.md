# 02 — Accept old majors end-to-end in runtime derivation; refresh fixtures

Status: open
Blocked by: 01

## What to build

Prove the widened window end-to-end through Rselectron's runtime derivation using the existing fake-Electron test seams (no real Electron install needed):

- `tests/unit/electron-runtime.test.ts`:
  - `writeFakeElectron({ appRoot, version: '28.3.3' })` resolves with `major === 28` and derived Main target `['electron28-main']` (mirror the existing 41-based resolution test).
  - Unsupported bounds: `27.x` and `44.x` both fail with `RSELECTRON_ELECTRON_UNSUPPORTED` — the floor and the frozen top of the window stay hard-rejected (extend the existing unsupported-major test).
- `tests/unit/renderer-advanced.test.ts`: switch the derived-browserslist default case from fake Electron `41.0.0` to `28.0.0` and assert the default `overrideBrowserslist` is `['chrome >= 120']`; explicit `electron{N}-renderer` risk-diagnostic cases may keep any in-window major.
- Refresh incidental fixtures in `tests/unit/inspect.test.ts` (fake `41.0.0`) and `tests/unit/benchmark-report.test.ts` (`43.2.0`) to in-window versions for freshness — no assertion changes expected.

## Acceptance criteria

- [ ] Fake Electron `28.3.3` resolves to major 28 and derives `electron28-main` Main target.
- [ ] `27.x` and `44.x` both fail with `RSELECTRON_ELECTRON_UNSUPPORTED`.
- [ ] Renderer default derivation with Electron 28 emits `chrome >= 120` and stays free of the `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK` diagnostic.
- [ ] Full `tests/unit` suite passes.
