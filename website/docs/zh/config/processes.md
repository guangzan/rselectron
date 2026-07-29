---
title: 主进程、预加载与渲染进程
description: 如何配置 main、preload、renderer，以及与 Rsbuild 的关系。
---

# 主进程、预加载与渲染进程

用 `defineConfig` 分别声明主进程、预加载脚本和渲染进程。每一项都是一份完整的 Rsbuild 配置，再叠上 Rselectron 自己的 `electron` 选项。

```ts title="rselectron.config.ts"
import { defineConfig } from 'rselectron';

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
      // 只接受 Rsbuild 插件。
    ],
  },
});
```

| 键 | 用途 |
| --- | --- |
| `main` | Electron 主进程 |
| `preload` | 预加载脚本 |
| `renderer` | 渲染进程（浏览器上下文） |

仅在有意省略某一进程时才不要配置它。缺失项会发出 `RSELECTRON_ROLE_MISSING` 警告，不会阻止其余进程构建。

多个页面属于同一个 `renderer` 配置 — 窗口与页面不是独立的配置对象。

Rselectron **只接受 Rsbuild 插件**。Vite 插件不会被翻译；请改用 Rsbuild / Rspack 等价物。见 [迁移](/guide/migration)。

Electron 相关字段见 [Electron 选项](./electron)；mode / env-mode 见 [环境](./environment)。
