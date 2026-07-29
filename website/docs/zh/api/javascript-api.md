---
title: JavaScript API
description: ESM 导出、选项与示例。
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

CLI 命令说明见 [命令行界面](./cli)；配置字段见 [配置](/config/)。

## `defineConfig`

为配置提供类型提示。可以导出对象，也可以导出函数（按命令 / 模式切换）：

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

函数参数包含 `command`（`dev` \| `build` \| `preview` \| `inspect`）、`mode` 与 `envMode`。

## `createServer`

启动开发会话：构建主进程 / 预加载，启动渲染进程开发服务器，并拉起 Electron。

```ts
import { createServer } from 'electron-rstack';

const server = await createServer({
  // cwd: process.cwd(),
  // configPath: './rselectron.config.ts',
  watch: true, // 或 { main: true, preload: true }
});

console.log(server.urls); // 渲染进程开发服务器 URL
// server.electronProcess — Electron 子进程

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});
```

常用选项：

| 选项 | 说明 |
| --- | --- |
| `cwd` | 项目根目录，默认 `process.cwd()` |
| `config` / `configPath` / `configLoader` | 内联配置或配置文件 |
| `mode` / `envMode` | 构建模式与环境文件命名空间 |
| `watch` | 主进程 / 预加载是否参与重建 |
| `rendererOnly` | 只起渲染进程开发服务，复用已有主进程 / 预加载产物 |

返回值：`urls`、`electronProcess`、幂等的 `close()`。

## `build`

对已配置进程执行一次生产构建（有限次，不支持 watch）。

```ts
import { build } from 'electron-rstack';

const result = await build({
  mode: 'production',
});

console.log(result.roles.main?.paths);
console.log(result.warnings);

await result.close();
```

传入 `watch: true` 会抛出错误；热重载请用 `createServer` 或 `rselectron dev --watch`。

## `preview`

先构建（可用 `skipBuild` 跳过），再启动 Electron 预览生产产物。

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

返回值：可选的 `buildResult`、`electronProcess`、幂等的 `close()`。

## `inspect`

打印规范化后的配置，不构建也不启动。适合在排障前核对各进程最终配置。

```ts
import { inspect } from 'electron-rstack';

const result = await inspect({ mode: 'development' });

console.log(result.format('human'));
// 或 result.format('json')

for (const warning of result.warnings) {
  console.warn(`[${warning.code}] ${warning.message}`);
}
```

## `loadEnv`

加载环境文件，默认前缀包括 `RSELECTRON_`、`MAIN_RSELECTRON_`、`PRELOAD_RSELECTRON_`、`RENDERER_RSELECTRON_`。行为对齐 CLI `--env-mode`。

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

更多前缀说明见 [环境](/config/environment)。

## `mergeRselectronConfig` / `mergeRsbuildConfig`

合并多份 Rselectron 配置（含各进程的 `electron` 字段）。`mergeRsbuildConfig` 来自 `@rsbuild/core`，按原样再导出。

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

找不到项目本地 Electron，或不在支持范围内时，会抛出带稳定错误码的 `RselectronError`。

## `RselectronError`

结构化失败，含稳定 `code`、可选 `hint`。

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

## Node 模块形态

在 TypeScript 中引入 ambient 声明：

```ts
/// <reference types="electron-rstack/node" />
```

### 开发服务器 URL

`dev` 会话中，主进程可通过环境变量拿到渲染进程地址：

```ts
const url = process.env.RSELECTRON_RENDERER_URL;
```

### 资源与 Worker

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

| 导入后缀 | 用途 |
| --- | --- |
| `?asset` | 解析为资源文件路径字符串 |
| `?asset&asarUnpack` | 同上，并标记需从 asar 解包 |
| `?modulePath` | 导出可交给 `Worker` / `utilityProcess.fork` 的模块路径 |
| `?nodeWorker` | 导出创建 `worker_threads.Worker` 的工厂函数 |
| `*.wasm?loader` | 导出加载 WASM 实例的函数 |
| `*.node` | 原生 addon 模块 |
