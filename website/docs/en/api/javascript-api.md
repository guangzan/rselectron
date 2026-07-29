---
title: JavaScript API
description: ESM exports, options, and examples.
---

# JavaScript API

```ts
import {
  build,
  createServer,
  defineConfig,
  ELECTRON_SUPPORT_SNAPSHOT,
  inspect,
  loadEnv,
  mergeRsbuildConfig,
  mergeRselectronConfig,
  preview,
  resolveProjectElectron,
  RselectronError,
  version,
} from 'electron-rstack';
```

CLI details: [Command Line Interface](./cli). Config fields: [Configuration](/config/).

## `defineConfig`

Adds type hints for your config. Export an object, or a function that switches on command / mode:

```ts title="rselectron.config.ts"
import { defineConfig } from 'electron-rstack';

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

```ts title="rselectron.config.ts"
import { defineConfig } from 'electron-rstack';

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'dev';
  return {
    main: {
      root: './src/main',
      source: { entry: { index: './index.ts' } },
      electron: { watch: isDev },
    },
    preload: {
      root: './src/preload',
      source: { entry: { index: './index.ts' } },
    },
    renderer: {
      root: './src/renderer',
      source: { entry: { index: './index.ts' } },
    },
  };
});
```

The function receives `command` (`dev` \| `build` \| `preview` \| `inspect`), `mode`, and `envMode`.

## `createServer`

Starts a development session: builds main / preload, starts the renderer dev server, and launches Electron.

```ts
import { createServer } from 'electron-rstack';

const server = await createServer({
  // cwd: process.cwd(),
  // configPath: './rselectron.config.ts',
  watch: true, // or { main: true, preload: true }
});

console.log(server.urls); // renderer dev-server URLs
// server.electronProcess — Electron child process

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});
```

Common options:

| Option | Description |
| --- | --- |
| `cwd` | Project root; defaults to `process.cwd()` |
| `config` / `configPath` / `configLoader` | Inline config or config file |
| `mode` / `envMode` | Build mode and environment-file namespace |
| `watch` | Whether main / preload participate in rebuilds |
| `rendererOnly` | Renderer dev server only; reuse existing main / preload outputs |

Returns `urls`, `electronProcess`, and an idempotent `close()`.

## `build`

Runs a finite production build for configured processes (no watch).

```ts
import { build } from 'electron-rstack';

const result = await build({
  mode: 'production',
});

console.log(result.roles.main?.paths);
console.log(result.warnings);

await result.close();
```

Passing `watch: true` throws; use `createServer` or `rselectron dev --watch` for hot reload.

## `preview`

Builds first (unless `skipBuild`), then launches Electron to preview production outputs.

```ts
import { preview } from 'electron-rstack';

const session = await preview({
  skipBuild: false,
  args: ['--trace-warnings'],
});

session.electronProcess.on('exit', async () => {
  await session.close();
});
```

Returns an optional `buildResult`, `electronProcess`, and an idempotent `close()`.

## `inspect`

Prints normalized configuration without building or launching. Useful before debugging compile or launch failures.

```ts
import { inspect } from 'electron-rstack';

const result = await inspect({ mode: 'development' });

console.log(result.format('human'));
// or result.format('json')

for (const warning of result.warnings) {
  console.warn(`[${warning.code}] ${warning.message}`);
}
```

## `loadEnv`

Loads environment files. Default prefixes include `RSELECTRON_`, `MAIN_RSELECTRON_`, `PRELOAD_RSELECTRON_`, and `RENDERER_RSELECTRON_`. Behavior matches CLI `--env-mode`.

```ts
import { defineConfig, loadEnv } from 'electron-rstack';

export default defineConfig(({ mode }) => {
  const env = loadEnv({ mode });
  return {
    main: {
      root: './src/main',
      source: {
        entry: { index: './index.ts' },
        define: {
          'process.env.APP_NAME': JSON.stringify(
            env.parsed.RSELECTRON_APP_NAME,
          ),
        },
      },
    },
  };
});
```

More on prefixes: [Environment](/config/environment).

## `mergeRselectronConfig` / `mergeRsbuildConfig`

Merge multiple Rselectron configs (including per-process `electron` fields). `mergeRsbuildConfig` is re-exported from `@rsbuild/core`.

```ts
import { defineConfig, mergeRselectronConfig } from 'electron-rstack';
import { shared } from './rselectron.shared';

export default defineConfig(
  mergeRselectronConfig(shared, {
    renderer: {
      root: './src/renderer',
      source: { entry: { index: './index.ts' } },
    },
  }),
);
```

## `resolveProjectElectron` / `ELECTRON_SUPPORT_SNAPSHOT` / `version`

```ts
import {
  ELECTRON_SUPPORT_SNAPSHOT,
  resolveProjectElectron,
  version,
} from 'electron-rstack';

console.log(version);
console.log(ELECTRON_SUPPORT_SNAPSHOT);
// { majors: [41, 42, 43], peerRange: '>=41 <44', ... }

const electron = resolveProjectElectron(process.cwd());
console.log(electron.version, electron.execPath, electron.major);
```

Missing project-local Electron, or a version outside the supported range, throws a `RselectronError` with a stable code.

## `RselectronError`

Structured failures with a stable `code` and optional `hint`.

```ts
import { build, RselectronError } from 'electron-rstack';

try {
  await build();
} catch (error) {
  if (error instanceof RselectronError) {
    console.error(error.code, error.message, error.hint);
  }
  throw error;
}
```

## Node module shapes

In TypeScript, pull in ambient declarations with:

```ts
/// <reference types="electron-rstack/node" />
```

### Dev-server URL

During `dev`, the main process can read the renderer URL from the environment:

```ts
const url = process.env.RSELECTRON_RENDERER_URL;
```

### Assets and workers

```ts
import icon from '../assets/icon.png?asset';
import unpack from '../assets/helper.bin?asset&asarUnpack';
import workerPath from './worker?modulePath';
import createWorker from './worker?nodeWorker';
import loadWasm from './add.wasm?loader';
import addon from './native.node';

import { Worker } from 'node:worker_threads';

new Worker(workerPath);
createWorker({ workerData: 'hello' });
await loadWasm();
```

| Import suffix | Purpose |
| --- | --- |
| `?asset` | Resolves to an asset file path string |
| `?asset&asarUnpack` | Same, and marks the file for asar unpack |
| `?modulePath` | Exports a module path for `Worker` / `utilityProcess.fork` |
| `?nodeWorker` | Exports a factory that creates a `worker_threads.Worker` |
| `*.wasm?loader` | Exports a function that loads a WASM instance |
| `*.node` | Native addon module |
