---
title: 主进程、预加载与渲染进程
description: 三进程配置形态、省略项，以及与 Rsbuild 的关系。
---

# 主进程、预加载与渲染进程

用 `defineConfig` 分别声明 `main`、`preload`、`renderer`。每一项都是该进程的完整 [Rsbuild 配置](https://rsbuild.rs/config/)，再叠上 Rselectron 自己的 `electron` 扩展。

Rselectron 会为**每个已配置的键创建独立的 Rsbuild 实例**。没有隐式的 `shared` 块，也不会把三个键当成同一编译器里的多个 environment — `root`、server 等实例级字段彼此独立。创建实例前，Rselectron 会剥离进程级 `electron` 字段，避免泄漏进 Rsbuild。

「接受完整 Rsbuild 配置」描述的是配置面。仅当 Rselectron 实际对该进程执行对应操作时，操作相关选项才会生效（例如标准生命周期会为 `renderer` 启动开发服务器；`main` / `preload` 走 build 或 watch）。

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
      // 只接受 Rsbuild 插件。
    ],
  },
});
```

| 键         | 用途                     |
| ---------- | ------------------------ |
| `main`     | Electron 主进程          |
| `preload`  | 预加载脚本               |
| `renderer` | 渲染进程（浏览器上下文） |

## 省略某一键

仅在有意省略某一进程时才不要配置它。缺失项会发出 `RSELECTRON_ROLE_MISSING` 警告，不会阻止其余已配置进程构建。

## 多个渲染页面

多个页面属于同一个 `renderer` 配置 — 窗口与页面不是独立的配置对象。多页面 / 多入口请用该键下的 Rsbuild 选项。

## 插件

Rselectron **只接受 Rsbuild 插件**。Vite 插件不会被翻译；请改用 Rsbuild / Rspack 等价物。见 [迁移](/guide/migration)。

## 相关

- Electron 相关字段：[Electron 选项](./electron)
- Mode / env-mode：[环境](./environment)
- 不用 `shared` 的组合方式：见 [配置](./) 概览中的 `mergeRselectronConfig` / `mergeRsbuildConfig`
