---
title: Command Line Interface
description: rselectron commands and options.
---

# Command Line Interface

Commands are explicit. Running `rselectron` with no command prints help to **stderr** and exits with status `1` without launching Electron. Long flags are **kebab-case** only — there are no camel-case aliases and no implicit default command.

Failures use `RselectronError` with a stable `code`; the CLI prints the message (and hint when present) and exits non-zero.

## `rselectron dev`

Builds main and preload, starts a development server for the renderer, and launches Electron.

## `rselectron build`

Builds configured main, preload, and renderer sources. Usually run this before packaging the Electron app.

`build` is finite and does **not** support watch. Passing `--watch` raises `RSELECTRON_BUILD_WATCH_UNSUPPORTED`. For main / preload hot reload use `rselectron dev --watch` instead.

## `rselectron preview`

Builds main, preload, and renderer (unless `--skip-build`) and launches Electron to preview.

## `rselectron inspect`

Prints normalized configuration without building or launching. Defaults to JSON; use `--format human` for readable text. Output includes per-process normalized Rselectron config, final Rsbuild config, and final Rspack config, with sensitive env-derived values redacted.

## Options

### Universal options

| Option                                   | Description                           |
| ---------------------------------------- | ------------------------------------- |
| `--config <path>`                        | Use the specified config file         |
| `--config-loader <auto\|jiti\|native>`   | Select the config loader              |
| `--mode <development\|production\|none>` | Set build mode                        |
| `--env-mode <name>`                      | Select the environment-file namespace |
| `-v, --version`                          | Show version                          |
| `-h, --help`                             | Show help                             |

`--mode` and `--env-mode` are independent — see [Environment](/config/environment).

### Dev options

| Option                                         | Description                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `--watch` / `--watch=main` / `--watch=preload` | Opt main and/or preload into rebuilds; overrides `electron.watch`           |
| `--renderer-only`                              | Start the renderer dev server only, reusing existing main / preload outputs |

:::tip Note

`--renderer-only` skips main and preload builds. Run a full `rselectron dev` (or `build`) at least once first, and do not keep using it after changing main or preload sources.

:::

When a watched configuration dependency changes, Rselectron reloads the config and replaces the development session.

### Preview options

| Option         | Description                                |
| -------------- | ------------------------------------------ |
| `--skip-build` | Skip build and launch Electron for preview |

### Inspect options

| Option                   | Description                    |
| ------------------------ | ------------------------------ |
| `--format <json\|human>` | Output format (default `json`) |

## Related

- Programmatic equivalents: [JavaScript API](./javascript-api)
- Config fields: [Configuration](/config/)
