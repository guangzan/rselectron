---
title: Concepts
description: Domain vocabulary for Roles, sessions, and builds.
---

# Concepts

Short definitions used across the docs. For a first run, start with [Getting started](./getting-started). Config details live under [Configuration](/config/).

## Product

**Rselectron** coordinates development and **source builds** for Electron apps on Rsbuild / Rspack.

## Application model

| Term                             | Meaning                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Application root**             | Directory used to resolve sources, outputs, and the default package manifest                     |
| **Application manifest**         | Package manifest for the Electron app (default: `package.json` at the application root)          |
| **Electron entry**               | File Electron launches; `package.json#main` unless overridden by config                          |
| **Project-local Electron**       | Electron install resolved from the application root — authority for launch and target derivation |
| **Role**                         | One of three independently configured source-build responsibilities: Main, Preload, or Renderer  |
| **Role configuration**           | Full Rsbuild config for one Role, plus Rselectron-owned `electron` options for that Role         |
| **Application Electron options** | Top-level `electron` fields for launch and discovery (not per-Role build behavior)               |
| **Source build**                 | Compiling configured Roles into Electron-consumable files — not an installer                     |

Multiple pages belong to a single **Renderer** Role. Windows and pages are not separate Rselectron config objects.

## Development lifecycle

| Term                         | Meaning                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Development session**      | Coordinated lifetime of Role builders, the renderer dev server, and the Electron child process                                |
| **Configuration generation** | One evaluation of the Rselectron config and the Role instances created from it; a config change replaces the whole generation |
| **Role update**              | Successful rebuild of a watched Main or Preload Role (Main restarts Electron; Preload asks renderers to fully reload)         |
| **Renderer-only session**    | Serves Renderer while reusing previously built Main / Preload outputs                                                         |

## Configuration vocabulary

| Term                 | Meaning                                                             |
| -------------------- | ------------------------------------------------------------------- |
| **Command**          | Explicit operation: Dev, Build, Preview, or Inspect                 |
| **Build mode**       | Rsbuild compilation mode (`development` / `production` / `none`)    |
| **Environment mode** | Independent environment-file namespace — does not choose build mode |

## Examples vs fixtures

| Kind                | Location                                                                                                                                                                     | Use                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Learning examples   | [`examples/vanilla`](https://github.com/guangzan/rselectron/tree/main/examples/vanilla), [`examples/react`](https://github.com/guangzan/rselectron/tree/main/examples/react) | Copy and learn from                          |
| Regression fixtures | `tests/fixtures/`                                                                                                                                                            | Automated tests only — not learning material |

## Related

- [Getting started](./getting-started)
- [Configuration](/config/)
- [API](/api/)
