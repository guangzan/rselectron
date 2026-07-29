---
title: 从 electron-vite 迁移
description: 语义映射与有意例外。
---

# 从 electron-vite 迁移

Rselectron 追求的是能力对齐，不是把 Vite 配置改个名就能跑。按语义迁移。

## 包与插件

| electron-vite | Rselectron |
| --- | --- |
| `electron-vite` 包 | `rselectron`（peer：`@rsbuild/core`） |
| Vite 插件 | **例外** — 改写为 Rsbuild / Rspack 插件 |
| Bytecode 插件 / V8 字节码 | **例外** — 不实现；无静默回退 |
| 导出的 SWC helper | **例外** — 通过 Rsbuild / Rspack 配置 SWC |

## 配置与环境

| 主题 | 映射 |
| --- | --- |
| Main / Preload / Renderer 的 Vite 配置 | `defineConfig` 下的 `main` / `preload` / `renderer`（Rsbuild） |
| Vite `root` / `build` / `plugins` | Rsbuild `root` / `output` / `plugins` |
| 环境文件 | `--env-mode` 与 `RSELECTRON_` / `MAIN_RSELECTRON_` 等前缀 |
| 构建模式 | `--mode`（`development` \| `production` \| `none`） |

## Watch 与开发

| electron-vite | Rselectron |
| --- | --- |
| Main / Preload watch | `electron.watch` 或 `rselectron dev --watch[=main\|preload]` |
| Renderer HMR | 渲染进程开发服务器（Vanilla / React 通过 Rsbuild 插件） |
| 配置变更 | 重新加载配置并替换整次开发会话 |

## API 与 CLI

| 面 | 说明 |
| --- | --- |
| CLI | 显式 `dev` / `build` / `preview` / `inspect`；长旗标仅 kebab-case |
| 编程 API | `build`、`createServer`、`preview`、`inspect`、`defineConfig` 等 |
| Electron 版本 | `ELECTRON_SUPPORT_SNAPSHOT` 与可选 Electron peer |
| 打包边界 | 仅源码构建；安装包交给 electron-builder / Forge |

## 清单

1. 用 Rsbuild 插件替换 Vite 插件。
2. 移除 bytecode / SWC-helper 用法；如仍有需求，在 Rselectron 之外自行处理。
3. 将各进程的 `root` 与入口映射到 Rsbuild 配置。
4. 在支持的 peer 范围内安装项目本地 Electron。
5. 先用 `rselectron inspect` 校验，再跑 `dev` / `build` / `preview`。
