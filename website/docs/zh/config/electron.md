---
title: Electron 选项
description: 进程级与应用级 electron 字段说明与示例。
---

# Electron 选项

`electron` 有两层：

- **进程级**：写在 `main` / `preload` / `renderer` 上，控制该进程的模块格式、依赖外置、热重载等。
- **应用级**：写在 `defineConfig` 顶层，控制启动入口、Electron 可执行文件、启动参数等。

Electron 始终从**项目本地**安装解析。版本范围见 [兼容性](/guide/compatibility)。

## 完整示例

```ts title="rselectron.config.ts"
import { defineConfig } from '@rselectron/core';

export default defineConfig({
  electron: {
    // 应用级：启动入口与参数
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
      // 隔离构建时默认不外置依赖，便于沙盒预加载打包进单文件
      externalizeDeps: false,
    },
  },
  renderer: {
    root: './src/renderer',
    source: { entry: { index: './index.ts' } },
  },
});
```

## 进程级字段

### `format`

控制主进程 / 预加载的输出模块格式。

| 值 | 含义 |
| --- | --- |
| `auto`（默认） | 根据项目本地 Electron 版本与环境推导 |
| `cjs` | CommonJS |
| `esm` | ES Module（需 Electron 版本支持 ESM） |

```ts
main: {
  electron: { format: 'cjs' },
},
preload: {
  electron: { format: 'esm' },
},
```

渲染进程通常不需要设置 `format`；它走浏览器侧 Rsbuild 目标。

### `watch`

在 `dev` 中让该进程参与重建。主进程成功重建后会重启 Electron；预加载成功重建后会请求已连接的渲染页面全量刷新。

```ts
main: {
  electron: { watch: true },
},
preload: {
  electron: { watch: true },
},
```

CLI 的 `--watch` / `--watch=main` / `--watch=preload` 会覆盖配置里的 `electron.watch`。见 [CLI](/api/cli)。

### `externalizeDeps`

为主进程 / 预加载决定是否把 Node 依赖留在 `node_modules`（外置），而不是打进 bundle。

| 值 | 含义 |
| --- | --- |
| 省略 | 主进程 / 预加载默认开启；`electron` 与 Node 内置模块始终外置 |
| `true` | 显式开启 |
| `false` | 关闭（依赖打进产物；沙盒预加载常用） |
| `{ include, exclude }` | 精细控制：`include` 强制打包，`exclude` 强制外置 |

```ts
main: {
  electron: {
    externalizeDeps: {
      // 把只发布为 ESM 的包打进 CJS 产物
      include: ['execa'],
      // 额外外置
      exclude: ['better-sqlite3'],
    },
  },
},
```

`electron` 与 Node 内置模块（含 `node:` 前缀）始终外置，不受 `include` 影响。

### `isolatedEntries`

为多入口做隔离构建：禁用共享 chunk，每个入口尽量自包含。常用于多个预加载脚本，或需要避免跨入口共享代码的场景。

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

预加载开启 `isolatedEntries` 时，默认会关闭依赖外置（便于沙盒环境加载单文件）。若同时显式设置 `externalizeDeps: true`，会保留你的选择并发出警告。

## 应用级字段

写在配置顶层的 `electron`：

| 字段 | 说明 |
| --- | --- |
| `entry` | Electron 启动入口文件；不设则使用 `package.json` 的 `main` |
| `packageJson` | 自定义应用清单路径（相对项目根） |
| `execPath` | 自定义 Electron 可执行文件；需与运行时事实一致，否则会失败 |
| `args` | 传给 Electron 进程的额外参数 |

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

更常见的做法是把 `package.json#main` 指到主进程产物，而不是每次写 `electron.entry`。见 [快速开始 · Electron 入口](/guide/getting-started#electron-入口)。

## 相关页面

- [主进程、预加载与渲染进程](./processes)
- [环境](./environment)
- [命令行界面](/api/cli)
