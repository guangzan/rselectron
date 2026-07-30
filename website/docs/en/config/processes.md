---
title: Main, preload, and renderer
description: Process config shape, omitted keys, and the relationship to Rsbuild.
---

# Main, preload, and renderer

Declare `main`, `preload`, and `renderer` under `defineConfig`. Each key is a complete [Rsbuild configuration](https://rsbuild.rs/config/) for that process, plus a Rselectron-owned `electron` extension.

Rselectron creates **one independent Rsbuild instance per configured key**. There is no implicit `shared` block and no single multi-compiler that treats the three keys as environments of one instance — `root`, server options, and other instance-level fields stay independent. Before creating an instance, Rselectron strips the process-level `electron` field so it never leaks into Rsbuild.

“Accepts the full Rsbuild configuration” describes the configuration surface. Operation-specific options only take effect when Rselectron actually runs that operation for the process (for example, the standard lifecycle starts a development server for `renderer`; `main` / `preload` use build or watch).

```ts title="rselectron.config.ts"
import { defineConfig } from '@rselectron/core';

export default defineConfig({
  main: {
    root: './src/main',
    source: { entry: { index: './index.ts' } },
    electron: {
      format: 'auto',
      watch: false,
    },
  },
  preload: {
    root: './src/preload',
    source: { entry: { index: './index.ts' } },
  },
  renderer: {
    root: './src/renderer',
    source: { entry: { index: './index.ts' } },
    plugins: [
      // Rsbuild plugins only.
    ],
  },
});
```

| Key        | Purpose                    |
| ---------- | -------------------------- |
| `main`     | Electron main process      |
| `preload`  | Preload scripts            |
| `renderer` | Renderer (browser context) |

## Omitting a key

Omit a key only when that process is intentionally absent. A missing key emits `RSELECTRON_ROLE_MISSING` and does not block the other configured processes from building.

## Multiple renderer pages

Multiple pages belong to a single `renderer` config — windows and pages are not separate configuration objects. Use Rsbuild multipage / multi-entry options under that one key.

## Plugins

Rselectron accepts **Rsbuild plugins only**. Vite plugins are not translated; migrate to Rsbuild / Rspack equivalents. See [Migration](/guide/migration).

## Related

- Electron-owned fields: [Electron options](./electron)
- Mode / env-mode: [Environment](./environment)
- Compose without `shared`: `mergeRselectronConfig` / `mergeRsbuildConfig` on the [Configuration](./) overview
