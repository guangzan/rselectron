---
title: Migrate from electron-vite
description: Semantic mapping and intentional exceptions.
---

# Migrate from electron-vite

Rselectron aims for capability alignment, not drop-in Vite config renaming. Migrate by semantics.

## Packages and plugins

| electron-vite | Rselectron |
| --- | --- |
| `electron-vite` package | `@rselectron/core` (peer: `@rsbuild/core`) |
| Vite plugins | **Exception** — rewrite as Rsbuild / Rspack plugins |
| Bytecode plugin / V8 bytecode | **Exception** — not implemented; no silent fallback |
| Exported SWC helpers | **Exception** — configure SWC via Rsbuild / Rspack |

## Config and environment

| Topic | Mapping |
| --- | --- |
| Main / Preload / Renderer Vite configs | `main` / `preload` / `renderer` under `defineConfig` (Rsbuild) |
| Vite `root` / `build` / `plugins` | Rsbuild `root` / `output` / `plugins` |
| Environment files | `--env-mode` plus `RSELECTRON_` / `MAIN_RSELECTRON_` and related prefixes |
| Build mode | `--mode` (`development` \| `production` \| `none`) |

## Watch and development

| electron-vite | Rselectron |
| --- | --- |
| Main / Preload watch | `electron.watch` or `rselectron dev --watch[=main\|preload]` |
| Renderer HMR | Renderer development server (Vanilla / React via Rsbuild plugins) |
| Config change | Reload config and replace the development session |

## API and CLI

| Surface | Notes |
| --- | --- |
| CLI | Explicit `dev` / `build` / `preview` / `inspect`; long flags kebab-case only |
| Programmatic API | `build`, `createServer`, `preview`, `inspect`, `defineConfig`, and related exports |
| Electron versions | `ELECTRON_SUPPORT_SNAPSHOT` and the optional Electron peer |
| Packaging boundary | Source builds only; use electron-builder / Forge for installers |

## Checklist

1. Replace Vite plugins with Rsbuild plugins.
2. Remove bytecode / SWC-helper usage; handle remaining needs outside Rselectron if required.
3. Map each process `root` and entry to Rsbuild config.
4. Install project-local Electron within the supported peer range.
5. Validate with `rselectron inspect`, then run `dev` / `build` / `preview`.
