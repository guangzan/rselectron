---
title: 配置
description: 主进程、预加载、渲染进程与 Electron / 环境选项。
---

# 配置

用 `defineConfig` 声明 `main`、`preload`、`renderer`。每一项都是一份 Rsbuild 配置，再叠上 Rselectron 的 `electron` 选项。

最小示例：

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

## 页面

| 页面                                    | 内容                                          |
| --------------------------------------- | --------------------------------------------- |
| [主进程、预加载与渲染进程](./processes) | 三进程配置形态、省略项，以及和 Rsbuild 的关系 |
| [Electron 选项](./electron)             | 进程级 / 应用级 `electron` 字段               |
| [环境](./environment)                   | `--mode`、`--env-mode` 与环境前缀             |

mode / env-mode 的 CLI 旗标见 [CLI](/api/cli)；程序化入口见 [JavaScript API](/api/javascript-api)。上手路径见 [快速开始](/guide/getting-started)。
