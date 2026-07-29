---
title: Electron options
description: Process-level and app-level electron fields with examples.
---

# Electron options

There are two layers of `electron` config:

- **Process-level** — on `main` / `preload` / `renderer`: module format, dependency externalization, hot reload, and related behavior.
- **App-level** — on the top level of `defineConfig`: launch entry, Electron executable, and process args.

Electron is always resolved from a **project-local** install. Version ranges: [Compatibility](/guide/compatibility).

## Full example

```ts title="rselectron.config.ts"
import { defineConfig } from '@rselectron/core';

export default defineConfig({
  electron: {
    // App-level: launch entry and args
    entry: './out/main/index.js',
    args: ['--trace-warnings'],
  },
  main: {
    root: './src/main',
    source: { entry: { index: './index.ts' } },
    electron: {
      format: 'auto',
      watch: true,
      externalizeDeps: true,
    },
  },
  preload: {
    root: './src/preload',
    source: { entry: { index: './index.ts' } },
    electron: {
      format: 'cjs',
      isolatedEntries: true,
      // Isolation defaults externalizeDeps off so sandboxed preload can ship as one file
      externalizeDeps: false,
    },
  },
  renderer: {
    root: './src/renderer',
    source: { entry: { index: './index.ts' } },
  },
});
```

## Process-level fields

### `format`

Controls the output module format for main / preload.

| Value | Meaning |
| --- | --- |
| `auto` (default) | Derived from the project-local Electron version and environment |
| `cjs` | CommonJS |
| `esm` | ES Module (requires an Electron version that supports ESM) |

```ts
main: {
  electron: { format: 'cjs' },
},
preload: {
  electron: { format: 'esm' },
},
```

Renderer usually does not need `format`; it uses browser-oriented Rsbuild targets.

### `watch`

During `dev`, opt this process into rebuilds. A successful main rebuild restarts Electron; a successful preload rebuild asks connected renderer pages to fully reload.

```ts
main: {
  electron: { watch: true },
},
preload: {
  electron: { watch: true },
},
```

CLI `--watch` / `--watch=main` / `--watch=preload` override `electron.watch` in config. See [CLI](/api/cli).

### `externalizeDeps`

For main / preload, decide whether Node dependencies stay in `node_modules` (externalized) instead of being bundled.

| Value | Meaning |
| --- | --- |
| omitted | On by default for main / preload; `electron` and Node builtins are always external |
| `true` | Explicitly enable |
| `false` | Disable (bundle deps into the output; common for sandboxed preload) |
| `{ include, exclude }` | Fine-grained: `include` forces bundling, `exclude` forces externalization |

```ts
main: {
  electron: {
    externalizeDeps: {
      // Bundle ESM-only packages into a CJS output
      include: ['execa'],
      // Force extra externals
      exclude: ['better-sqlite3'],
    },
  },
},
```

`electron` and Node builtins (including the `node:` prefix) are always external and ignore `include`.

### `isolatedEntries`

Build isolated entry graphs: disable shared chunks so each entry stays self-contained. Useful for multiple preload scripts or when shared code across entries is undesirable.

```ts
preload: {
  source: {
    entry: {
      browser: './browser.ts',
      webview: './webview.ts',
    },
  },
  electron: {
    isolatedEntries: true,
    externalizeDeps: false,
  },
},
```

With `isolatedEntries` on preload, dependency externalization defaults to off (so a sandboxed preload can load a single file). Setting `externalizeDeps: true` explicitly keeps your choice and emits a warning.

## App-level fields

Top-level `electron` on the config:

| Field | Description |
| --- | --- |
| `entry` | Electron launch entry file; falls back to `package.json#main` when omitted |
| `packageJson` | Custom application manifest path (relative to the project root) |
| `execPath` | Custom Electron executable; must be consistent with runtime facts or the run fails |
| `args` | Extra arguments passed to the Electron process |

```ts
export default defineConfig({
  electron: {
    entry: './out/main/index.cjs',
    packageJson: './package.json',
    args: ['--no-sandbox'],
  },
  main: {
    /* ... */
  },
});
```

More often you point `package.json#main` at the main-process output instead of setting `electron.entry` every time. See [Getting started · Electron entry](/guide/getting-started#electron-entry).

## Related pages

- [Main, preload, and renderer](./processes)
- [Environment](./environment)
- [Command Line Interface](/api/cli)
