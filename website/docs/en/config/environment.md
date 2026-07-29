---
title: Environment
description: Build mode, env-mode, and process-scoped environment prefixes.
---

# Environment

- `--mode` selects the Rsbuild build mode: `development`, `production`, or `none`.
- `--env-mode` selects an environment-file namespace independently of build mode.
- Builds load `RSELECTRON_` through Rsbuild’s environment pipeline, plus process-scoped prefixes:
  - Main: `MAIN_RSELECTRON_`
  - Preload: `PRELOAD_RSELECTRON_`
  - Renderer: `RENDERER_RSELECTRON_`

Programmatic loading via `loadEnv` matches CLI `--env-mode`. See [JavaScript API](/api/javascript-api) and [CLI](/api/cli).
