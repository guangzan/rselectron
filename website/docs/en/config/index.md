---
title: Configuration
description: Main, preload, renderer, and Electron / environment options.
---

# Configuration

Declare `main`, `preload`, and `renderer` with `defineConfig`. Each key is an Rsbuild config, plus Rselectron `electron` options.

Minimal example:

```ts
import { defineConfig } from '@rselectron/core';

export default defineConfig({
  main: {
    root: './src/main',
    source: { entry: { index: './index.ts' } },
  },
  preload: {
    root: './src/preload',
    source: { entry: { index: './index.ts' } },
  },
  renderer: {
    root: './src/renderer',
    source: { entry: { index: './index.ts' } },
  },
});
```

## Pages

| Page | Contents |
| ---- | -------- |
| [Main, preload, and renderer](./processes) | Process config shape, omitted keys, and Rsbuild relationship |
| [Electron options](./electron) | Process-level and app-level `electron` fields |
| [Environment](./environment) | `--mode`, `--env-mode`, and env prefixes |

CLI flags for mode / env-mode: [CLI](/api/cli). Programmatic entry points: [JavaScript API](/api/javascript-api). Getting started: [Getting started](/guide/getting-started).
