---
title: API
description: CLI 与 JavaScript API 概览。
---

# API

Rselectron 提供两个稳定面，共享同一套规范化与编排管线。CLI 是程序化操作的**适配器** — 不会另维护一套行为实现。

| 表面                               | 适用场景                         | 页面                   |
| ---------------------------------- | -------------------------------- | ---------------------- |
| [命令行界面](./cli)                | 终端工作流                       | 命令与选项             |
| [JavaScript API](./javascript-api) | 在工具或脚本中嵌入构建与开发     | ESM 导出与生命周期辅助 |

## 命令一览

| 命令                 | 用途                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| `rselectron dev`     | 开发会话：构建 main / preload、服务 renderer、启动 Electron                |
| `rselectron build`   | 一次性生产源码构建（不支持 watch）                                         |
| `rselectron preview` | 构建（可用 `--skip-build` 跳过）后，用生产产物启动 Electron                |
| `rselectron inspect` | 打印规范化配置，不构建也不启动                                             |

**没有**隐式默认命令。不带子命令运行 `rselectron` 时，会向 stderr 打印帮助并以 `1` 退出。

运行失败以带稳定 `code` 的 `RselectronError` 呈现；CLI 的退出码与文案是该错误的投影。

配置形态见 [配置](/config/)。环境旗标见 [环境](/config/environment)。
