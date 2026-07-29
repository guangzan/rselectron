---
title: 命令行界面
description: rselectron 命令与选项。
---

# 命令行界面

命令必须显式给出。不带命令运行 `rselectron` 时，会向 stderr 打印帮助并以状态码 `1` 退出，不会启动 Electron。

## `rselectron dev`

构建主进程与预加载脚本，为渲染进程启动开发服务器，并启动 Electron 应用。

## `rselectron build`

构建已配置的主进程、预加载脚本与渲染进程源码。通常在打包 Electron 应用之前执行。

## `rselectron preview`

构建主进程、预加载脚本与渲染进程（可用 `--skip-build` 跳过），并启动 Electron 进行预览。

## `rselectron inspect`

打印规范化后的配置，不构建也不启动。默认输出 JSON；可用 `--format human` 查看可读文本。

## 选项

### 通用选项

| 选项 | 描述 |
| --- | --- |
| `--config <path>` | 指定配置文件路径 |
| `--config-loader <auto\|jiti\|native>` | 选择配置加载器 |
| `--mode <development\|production\|none>` | 设置构建模式 |
| `--env-mode <name>` | 选择环境文件命名空间 |
| `-v, --version` | 显示版本号 |
| `-h, --help` | 显示帮助 |

长旗标仅使用 kebab-case。

### Dev 选项

| 选项 | 描述 |
| --- | --- |
| `--watch` / `--watch=main` / `--watch=preload` | 让主进程和/或预加载参与重建；覆盖 `electron.watch` |
| `--renderer-only` | 仅启动渲染进程开发服务，复用已有的主进程 / 预加载产物 |

:::tip 提示

`--renderer-only` 会跳过主进程与预加载构建。使用前必须至少完整运行过一次 `rselectron dev`（或 `build`），且不要在改动主进程 / 预加载源码后继续使用。

:::

配置文件等被监听的依赖变化时，会重新加载配置并替换当前开发会话。

### Preview 选项

| 选项 | 描述 |
| --- | --- |
| `--skip-build` | 跳过构建，直接启动 Electron 预览 |

### Inspect 选项

| 选项 | 描述 |
| --- | --- |
| `--format <json\|human>` | 输出格式（默认 `json`） |
