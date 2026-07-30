---
title: 配置
description: defineConfig 总览、阅读地图，以及 Rselectron 如何扩展 Rsbuild。
---

# 配置

用 `@rselectron/core` 的 `defineConfig` 声明配置。外层是三个进程键 — `main`、`preload`、`renderer` — 以及可选的顶层 `electron`，用于应用启动与发现。

每个进程键都是一份完整的 [Rsbuild 配置](https://rsbuild.rs/config/)，再叠上该进程的 Rselectron `electron` 选项。Rselectron 不会再写一份并行的选项百科；通用 Rsbuild 字段请查 Rsbuild 文档，Rselectron 增量见下面各页。

默认只发现 `rselectron.config.{ts,js,mts,mjs,cts,cjs}`。显式传入配置路径可使用其他文件名。加载委托给 Rsbuild 的配置加载器（默认 `auto`；见 [CLI](/api/cli) 的 `--config-loader`）。

## 最小示例

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

## 配置函数

`defineConfig` 也接受函数，参数为 `{ command, mode, envMode }`：

| 字段      | 含义                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| `command` | 当前操作：`dev`、`build`、`preview` 或 `inspect`                                               |
| `mode`    | Rsbuild [构建模式](https://rsbuild.rs/guide/basic/mode)：`development`、`production` 或 `none` |
| `envMode` | 环境文件命名空间；与构建模式相互独立 — 见 [环境](./environment)                                |

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

需要按环境文件命名空间分支时使用 `envMode`；文件加载规则仍见 [环境](./environment)。

## 组合配置

没有隐式的 `shared` 块。跨进程复用请显式组合：

- `mergeRselectronConfig` — 合并外层进程键与应用级 `electron`
- `mergeRsbuildConfig` — 在单个进程的 Rsbuild 面上合并（保留 Rsbuild 插件 / 函数合并规则）

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

## 阅读地图

| 页面                                    | 内容                                     |
| --------------------------------------- | ---------------------------------------- |
| [主进程、预加载与渲染进程](./processes) | 进程配置形态、省略项、独立 Rsbuild 实例  |
| [Electron 选项](./electron)             | 进程级 / 应用级 `electron` 字段          |
| [环境](./environment)                   | `--mode`、`--env-mode`、前缀与 `loadEnv` |

mode / env-mode 的 CLI 旗标见 [CLI](/api/cli)；程序化入口见 [JavaScript API](/api/javascript-api)。上手见 [快速开始](/guide/getting-started)。
