---
title: API
description: Overview of the CLI and JavaScript API.
---

# API

Rselectron exposes two stable surfaces that share one normalization and orchestration pipeline. The CLI is an **adapter** over the same programmatic operations — it does not maintain a second behavior implementation.

| Surface                            | When to use                                               | Page                              |
| ---------------------------------- | --------------------------------------------------------- | --------------------------------- |
| [Command Line Interface](./cli)    | Terminal workflows                                        | Commands and options              |
| [JavaScript API](./javascript-api) | Embed builds and development in tools or scripts          | ESM exports and lifecycle helpers |

## Commands at a glance

| Command              | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `rselectron dev`     | Development session: build main / preload, serve renderer, launch Electron |
| `rselectron build`   | Finite production source build (no watch)                               |
| `rselectron preview` | Build (unless `--skip-build`) and launch Electron against production outputs |
| `rselectron inspect` | Print normalized configuration without building or launching            |

There is **no** implicit default command. Running `rselectron` with no subcommand prints help to stderr and exits `1`.

Operational failures surface as `RselectronError` with a stable `code`. CLI exit codes and messages are projections of that error.

Configuration shape: [Configuration](/config/). Environment flags: [Environment](/config/environment).
