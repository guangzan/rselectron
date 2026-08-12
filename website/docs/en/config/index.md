---
title: Configuration
description: defineConfig overview, reading map, and how Rselectron extends Rsbuild.
---

# Configuration

Rselectron automatically discovers a config file named `rselectron.config.{ts,js,mts,mjs,cts,cjs}` at the project root. Pass an explicit config path to use another filename. Loading delegates to Rsbuild’s config loader (`auto` by default; see [CLI](/api/cli) for `--config-loader`).

Rselectron configuration is declared with `defineConfig`. The outer shape has three process keys — `main`, `preload`, and `renderer` — plus an optional top-level `electron` block for application launch and discovery.

Each process key is a full [Rsbuild configuration](https://rsbuild.rs/config/), extended with Rselectron-owned `electron` options for that process. Look up shared Rsbuild fields in the Rsbuild docs and use [Processes](./processes), [Electron](./electron), and [Environment](./environment) for Rselectron increments.

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
