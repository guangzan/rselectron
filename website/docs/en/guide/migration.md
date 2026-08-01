---
title: Migrate from electron-vite
description: Semantic mapping and intentional exceptions.
---

# Migrate from electron-vite

Rselectron aims for **capability parity**, not drop-in Vite config renaming. Migrate by semantics. Known **parity exceptions** (Vite plugins, V8 bytecode, exported SWC helpers) are summarized under [Compatibility](./compatibility) and the [compatibility matrix](https://github.com/guangzan/rselectron/blob/main/docs/monorail/compatibility-matrix.md).

## Packages and plugins

| electron-vite                 | Rselectron                                          |
| ----------------------------- | --------------------------------------------------- |
| `electron-vite` package       | `@rselectron/core` (peer: `@rsbuild/core`)          |
| Vite plugins                  | **Exception** — rewrite as Rsbuild / Rspack plugins |
| Bytecode plugin / V8 bytecode | **Exception** — not implemented; no silent fallback |
| Exported SWC helpers          | **Exception** — configure SWC via Rsbuild / Rspack  |

## Config and environment

| Topic                                  | Mapping                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Main / Preload / Renderer Vite configs | `main` / `preload` / `renderer` under `defineConfig` (Rsbuild) — [Configuration](/config/) |
| Vite `root` / `build` / `plugins`      | Rsbuild `root` / `output` / `plugins`                                                      |
| Environment files                      | `--env-mode` plus `RSELECTRON_` prefixes — [Environment](/config/environment)              |
| Build mode                             | `--mode` (`development` \| `production` \| `none`)                                         |
| Electron launch options                | Top-level `electron` — [Electron options](/config/electron)                                |

## Watch and development

| electron-vite        | Rselectron                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| Main / Preload watch | `electron.watch` or `rselectron dev --watch[=main\|preload]` — [CLI](/api/cli) |
| Renderer HMR         | Renderer development server (Vanilla / React via Rsbuild plugins)              |
| Config change        | Reload config and replace the development session                              |

## API and CLI

| Surface            | Notes                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| CLI                | Explicit `dev` / `build` / `preview` / `inspect`; long flags kebab-case only — [CLI](/api/cli)                             |
| Programmatic API   | `build`, `createServer`, `preview`, `inspect`, `defineConfig`, and related exports — [JavaScript API](/api/javascript-api) |
| Electron versions  | `ELECTRON_SUPPORT_SNAPSHOT` and the optional Electron peer                                                                 |
| Packaging boundary | Source builds only; use electron-builder / Forge for installers                                                            |

## Checklist

1. Replace Vite plugins with Rsbuild plugins.
2. Remove bytecode / SWC-helper usage; handle remaining needs outside Rselectron if required.
3. Map each process `root` and entry to Rsbuild config under [Configuration](/config/).
4. Point `package.json#main` at the planned Main output under Conventional role outputs (`out/main/...` when `distPath` is unset). Early beta unset layouts used `<roleRoot>/dist`—set an explicit `distPath` if you still want that layout.
5. Install project-local Electron within the supported peer range ([Compatibility](./compatibility)).
6. Validate with `rselectron inspect`, then run `dev` / `build` / `preview`.
7. Prefer copying from [`examples/`](https://github.com/guangzan/rselectron/tree/main/examples), not from `tests/fixtures/`.
