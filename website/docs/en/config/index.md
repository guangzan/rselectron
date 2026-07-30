---
title: Configuration
description: defineConfig overview, reading map, and how Rselectron extends Rsbuild.
---

# Configuration

Rselectron configuration is declared with `defineConfig` from `@rselectron/core`. The outer shape has three process keys — `main`, `preload`, and `renderer` — plus an optional top-level `electron` block for application launch and discovery.

Each process key is a full [Rsbuild configuration](https://rsbuild.rs/config/), extended with Rselectron-owned `electron` options for that process. Rselectron does not invent a parallel option encyclopedia; look up shared Rsbuild fields in the Rsbuild docs and use the pages below for Rselectron increments.

By default the loader discovers `rselectron.config.{ts,js,mts,mjs,cts,cjs}` only. Pass an explicit config path to use another filename. Loading delegates to Rsbuild’s config loader (`auto` by default; see [CLI](/api/cli) for `--config-loader`).

## Minimal example

```ts title="rselectron.config.ts"
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

## Config as a function

`defineConfig` also accepts a function. It receives `{ command, mode, envMode }`:

| Field     | Meaning                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------- |
| `command` | Current operation: `dev`, `build`, `preview`, or `inspect`                                        |
| `mode`    | Rsbuild [build mode](https://rsbuild.rs/guide/basic/mode): `development`, `production`, or `none` |
| `envMode` | Environment-file namespace; independent of build mode — see [Environment](./environment)          |

```ts title="rselectron.config.ts"
import { defineConfig } from '@rselectron/core';

export default defineConfig(({ command, mode, envMode }) => ({
  main: {
    root: './src/main',
    source: { entry: { index: './index.ts' } },
    output: {
      minify: command === 'build' && mode === 'production',
    },
  },
  // Branch on envMode when needed; file loading still follows Environment.
  preload: {
    root: './src/preload',
    source: { entry: { index: './index.ts' } },
  },
  renderer: {
    root: './src/renderer',
    source: { entry: { index: './index.ts' } },
  },
}));
```

Use `envMode` when composing env-aware options; file loading still follows [Environment](./environment).

## Composing configs

There is no implicit `shared` block. To reuse pieces across processes, compose explicitly:

- `mergeRselectronConfig` — merge outer process keys and application-level `electron`
- `mergeRsbuildConfig` — merge within one process’s Rsbuild surface (preserves Rsbuild plugin / function merge rules)

```ts
import {
  defineConfig,
  mergeRselectronConfig,
  mergeRsbuildConfig,
} from '@rselectron/core';

const withLegacyDecorators = {
  source: { decorators: { version: 'legacy' as const } },
};

export default defineConfig(
  mergeRselectronConfig(
    {
      main: mergeRsbuildConfig(
        { root: './src/main', source: { entry: { index: './index.ts' } } },
        withLegacyDecorators,
      ),
      preload: mergeRsbuildConfig(
        { root: './src/preload', source: { entry: { index: './index.ts' } } },
        withLegacyDecorators,
      ),
    },
    {
      renderer: {
        root: './src/renderer',
        source: { entry: { index: './index.ts' } },
      },
    },
  ),
);
```

## Reading map

| Page                                       | Contents                                                   |
| ------------------------------------------ | ---------------------------------------------------------- |
| [Main, preload, and renderer](./processes) | Process shape, omitted keys, independent Rsbuild instances |
| [Electron options](./electron)             | Process-level and app-level `electron` fields              |
| [Environment](./environment)               | `--mode`, `--env-mode`, prefixes, and `loadEnv`            |

CLI flags for mode / env-mode: [CLI](/api/cli). Programmatic entry points: [JavaScript API](/api/javascript-api). First run: [Getting started](/guide/getting-started).
