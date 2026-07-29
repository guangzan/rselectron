---
title: Main, preload, and renderer
description: How to configure main, preload, and renderer, and how they relate to Rsbuild.
---

# Main, preload, and renderer

Declare main, preload, and renderer under `defineConfig`. Each key is a full Rsbuild config, plus Rselectron-owned `electron` options.

```ts title="rselectron.config.ts"
import { defineConfig } from 'electron-rstack';

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

| Key | Purpose |
| --- | --- |
| `main` | Electron main process |
| `preload` | Preload scripts |
| `renderer` | Renderer (browser context) |

Omit a key only when that process is intentionally absent. A missing key emits `RSELECTRON_ROLE_MISSING` and does not block the other processes from building.

Multiple pages belong to a single `renderer` config — windows and pages are not separate config objects.

Rselectron accepts **Rsbuild plugins only**. Vite plugins are not translated; migrate to Rsbuild / Rspack equivalents. See [Migration](/guide/migration).

Electron-owned fields: [Electron options](./electron). Mode / env-mode: [Environment](./environment).
