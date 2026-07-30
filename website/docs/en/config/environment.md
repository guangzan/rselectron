---
title: Environment
description: Build mode, env-mode, prefixes, and programmatic loadEnv.
---

# Environment

Build mode and environment-file selection are **independent**. Changing one does not change the other.

| Concern            | Selected by                         | Meaning                                                                 |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| Build mode         | `--mode` / config context `mode`    | Rsbuild [compilation mode](https://rsbuild.rs/guide/basic/mode): `development`, `production`, or `none` |
| Environment mode   | `--env-mode` / config context `envMode` | Environment-file namespace (which `.env*` files Rsbuild loads)          |

CLI details: [CLI](/api/cli). In a config function, both appear as `{ command, mode, envMode }` — see [Configuration](./).

## How files are loaded

Rselectron loads environment variables through Rsbuild’s environment pipeline (rich result model, not a flattened record). File naming and override order follow [Rsbuild environment variables](https://rsbuild.rs/guide/advanced/env-vars); `--env-mode` / `envMode` selects the namespace the same way Rsbuild’s env mode does.

Default public prefixes:

| Prefix               | Scope                                      |
| -------------------- | ------------------------------------------ |
| `RSELECTRON_`        | Shared across processes                    |
| `MAIN_RSELECTRON_`   | Main                                       |
| `PRELOAD_RSELECTRON_` | Preload                                   |
| `RENDERER_RSELECTRON_` | Renderer                                 |

When Rselectron builds a process, it loads the shared prefix plus that process’s scoped prefix via `envPrefixesForRole`.

Only `RSELECTRON_RENDERER_URL` is reserved for the development renderer URL. Main and Preload can read it through the `rselectron/node` type entry on `ProcessEnv` without application-owned ambient declarations.

## Programmatic loading

`loadEnv` matches CLI `--env-mode` and defaults to `RSELECTRON_ENV_PREFIXES` (all four prefixes above). Override `prefixes` when you need a subset.

```ts
import { envPrefixesForRole, loadEnv } from '@rselectron/core';

// Same namespace selection as `rselectron build --env-mode=staging`
const all = loadEnv({ mode: 'staging' });

const mainOnly = loadEnv({
  mode: 'staging',
  prefixes: [...envPrefixesForRole('main')],
});
```

`envPrefixesForRole('main' | 'preload' | 'renderer')` returns the shared `RSELECTRON_` prefix plus the process-scoped one.

See [JavaScript API](/api/javascript-api) for the full `loadEnv` surface.

## Related

- [Configuration](./) — config function context
- [Electron options](./electron)
- [CLI](/api/cli) — `--mode`, `--env-mode`
