# Vanilla example

Learning artifact for a minimal Main / Preload / Renderer application.

This directory is **not** a regression fixture. Automated tests use
`tests/fixtures/` instead.

## Layout

- `src/main` — Main Role entry
- `src/preload` — Preload Role entry
- `src/renderer` — Renderer Role entry
- `rselectron.config.ts` — Role configuration

Copy this tree into a real application, install `@rselectron/core`, `@rsbuild/core`,
and a supported Electron major, then run `pnpm dev`.
