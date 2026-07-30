---
title: 环境
description: 构建模式、env-mode、前缀与程序化 loadEnv。
---

# 环境

构建模式与环境文件选择**相互独立**。改其中一个不会改另一个。

| 关注点   | 由谁选择                            | 含义                                                                                           |
| -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| 构建模式 | `--mode` / 配置上下文 `mode`        | Rsbuild [编译模式](https://rsbuild.rs/guide/basic/mode)：`development`、`production` 或 `none` |
| 环境模式 | `--env-mode` / 配置上下文 `envMode` | 环境文件命名空间（Rsbuild 加载哪些 `.env*` 文件）                                              |

CLI 细节见 [CLI](/api/cli)。配置函数里两者都出现在 `{ command, mode, envMode }` — 见 [配置](./)。

## 文件如何加载

Rselectron 通过 Rsbuild 的环境管道加载变量（富结果模型，不是拍平后的单一对象）。文件命名与覆盖顺序遵循 [Rsbuild 环境变量](https://rsbuild.rs/guide/advanced/env-vars)；`--env-mode` / `envMode` 选择命名空间的方式与 Rsbuild 的 env mode 一致。

默认公开前缀：

| 前缀                   | 范围       |
| ---------------------- | ---------- |
| `RSELECTRON_`          | 各进程共享 |
| `MAIN_RSELECTRON_`     | 主进程     |
| `PRELOAD_RSELECTRON_`  | 预加载     |
| `RENDERER_RSELECTRON_` | 渲染进程   |

构建某一进程时，Rselectron 会通过 `envPrefixesForRole` 加载共享前缀加上该进程的作用域前缀。

仅 `RSELECTRON_RENDERER_URL` 保留给开发态渲染进程 URL。主进程与预加载可通过 `rselectron/node` 的 `ProcessEnv` 类型声明读取它，无需应用自建 ambient 声明。

## 程序化加载

`loadEnv` 与 CLI `--env-mode` 对齐，默认使用 `RSELECTRON_ENV_PREFIXES`（上表四个前缀）。需要子集时覆盖 `prefixes`。

```ts
import { envPrefixesForRole, loadEnv } from '@rselectron/core';

// 与 `rselectron build --env-mode=staging` 同一命名空间
const all = loadEnv({ mode: 'staging' });

const mainOnly = loadEnv({
  mode: 'staging',
  prefixes: [...envPrefixesForRole('main')],
});
```

`envPrefixesForRole('main' | 'preload' | 'renderer')` 返回共享的 `RSELECTRON_` 加上该进程作用域前缀。

完整 `loadEnv` 面见 [JavaScript API](/api/javascript-api)。

## 相关

- [配置](./) — 配置函数上下文
- [Electron 选项](./electron)
- [CLI](/api/cli) — `--mode`、`--env-mode`
