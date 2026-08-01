---
title: 从 electron-vite 迁移
description: 语义映射与有意例外。
---

# 从 electron-vite 迁移

Rselectron 追求**能力对等**，而不是 Vite 配置的一比一重命名。按语义迁移。已知**对等例外**（Vite 插件、V8 bytecode、导出的 SWC helper）见 [兼容性](./compatibility) 与 [兼容性矩阵](https://github.com/guangzan/rselectron/blob/main/docs/monorail/compatibility-matrix.md)。

## 包与插件

| electron-vite               | Rselectron                                  |
| --------------------------- | ------------------------------------------- |
| `electron-vite` 包          | `@rselectron/core`（peer：`@rsbuild/core`） |
| Vite 插件                   | **例外** — 改写为 Rsbuild / Rspack 插件     |
| Bytecode 插件 / V8 bytecode | **例外** — 未实现；无静默回退               |
| 导出的 SWC helper           | **例外** — 通过 Rsbuild / Rspack 配置 SWC   |

## 配置与环境

| 主题                                   | 映射                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Main / Preload / Renderer 的 Vite 配置 | `defineConfig` 下的 `main` / `preload` / `renderer`（Rsbuild）— [配置](/config/) |
| Vite `root` / `build` / `plugins`      | Rsbuild `root` / `output` / `plugins`                                            |
| 环境文件                               | `--env-mode` 与 `RSELECTRON_` 等前缀 — [环境](/config/environment)               |
| 构建模式                               | `--mode`（`development` \| `production` \| `none`）                              |
| Electron 启动选项                      | 顶层 `electron` — [Electron 选项](/config/electron)                              |

## 监视与开发

| electron-vite        | Rselectron                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| Main / Preload watch | `electron.watch` 或 `rselectron dev --watch[=main\|preload]` — [CLI](/api/cli) |
| Renderer HMR         | 渲染进程开发服务器（Vanilla / React 通过 Rsbuild 插件）                        |
| 配置变更             | 重新加载配置并替换开发会话                                                     |

## API 与 CLI

| 表面          | 说明                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| CLI           | 显式 `dev` / `build` / `preview` / `inspect`；长旗标仅 kebab-case — [CLI](/api/cli)                              |
| 程序化 API    | `build`、`createServer`、`preview`、`inspect`、`defineConfig` 及相关导出 — [JavaScript API](/api/javascript-api) |
| Electron 版本 | `ELECTRON_SUPPORT_SNAPSHOT` 与可选 Electron peer                                                                 |
| 打包边界      | 仅源码构建；安装包用 electron-builder / Forge                                                                    |

## 清单

1. 把 Vite 插件换成 Rsbuild 插件。
2. 去掉 bytecode / SWC-helper 用法；剩余需求在 Rselectron 外处理。
3. 把各进程 `root` 与入口映射到 [配置](/config/) 下的 Rsbuild 配置。
4. 把 `package.json#main` 指到约定角色产物下的计划 Main 输出（未设置 `distPath` 时为 `out/main/...`）。早期 beta 未设置时会落到 `<processRoot>/dist`——若仍要该布局，请显式设置 `distPath`。
5. `"type": "module"` 应用优先 Preferred ESM path：保持 `electron.format` 为 `auto`（推导 ESM）。走上 ESM 后去掉 beta 期 CJS workaround——被迫的 `format: 'cjs'`、仅为 import-only 包加的 `externalizeDeps.include` 白名单，以及默认的 `webpackIgnore` / 魔法注释 `import()` 互操作（[故障排除](./troubleshooting#cjs-主进程--预加载下-import-only-包失败)）。
6. 在受支持 peer 范围内安装项目本地 Electron（[兼容性](./compatibility)）。
7. 用 `rselectron inspect` 校验，再跑 `dev` / `build` / `preview`。
8. 优先从 [`examples/`](https://github.com/guangzan/rselectron/tree/main/examples) 复制，不要从 `tests/fixtures/` 学。
