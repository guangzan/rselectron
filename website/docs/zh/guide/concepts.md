---
title: 概念
description: Role、会话与构建相关的领域词汇。
---

# 概念

文档中反复出现的短定义。第一次上手请从 [快速开始](./getting-started) 入手。配置细节见 [配置](/config/)。

## 产品

**Rselectron** 在 Rsbuild / Rspack 上协调 Electron 应用的开发与**源码构建**。

## 应用模型

| 术语                                            | 含义                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| **应用根目录（Application root）**              | 解析源码位置、输出位置与默认包清单的基准目录                             |
| **应用清单（Application manifest）**            | 描述 Electron 应用的包清单（默认：应用根下的 `package.json`）            |
| **Electron 入口（Electron entry）**             | Electron 启动的文件；除非被配置覆盖，以 `package.json#main` 为准         |
| **项目本地 Electron（Project-local Electron）** | 从应用根解析出的 Electron 安装 — 启动与目标推导的权威来源                |
| **角色（Role）**                                | 三项独立配置的源码构建职责之一：Main、Preload 或 Renderer                |
| **角色配置（Role configuration）**              | 某一 Role 的完整 Rsbuild 配置，加上该 Role 的 Rselectron `electron` 选项 |
| **应用级 Electron 选项**                        | 顶层 `electron` 字段，负责启动与发现（不是按 Role 的构建行为）           |
| **源码构建（Source build）**                    | 将已配置 Role 编译为 Electron 可消费文件 — 不是安装包                    |

多个页面属于同一个 **Renderer** Role。窗口与页面不是独立的 Rselectron 配置对象。

## 开发生命周期

| 术语                                     | 含义                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| **开发会话（Development session）**      | 已配置 Role 构建器、renderer 开发服务器与 Electron 子进程的协调生命周期                   |
| **配置世代（Configuration generation）** | 对 Rselectron 配置的一次求值及由此创建的 Role 实例；配置变更会替换整个世代                |
| **角色更新（Role update）**              | 被监听的 Main 或 Preload 的一次成功重建（Main 重启 Electron；Preload 请求渲染页全量刷新） |
| **仅 Renderer 会话**                     | 服务 Renderer 的同时复用此前构建的 Main / Preload 输出                                    |

## 配置词汇

| 术语                             | 含义                                                      |
| -------------------------------- | --------------------------------------------------------- |
| **命令（Command）**              | 显式操作：Dev、Build、Preview 或 Inspect                  |
| **构建模式（Build mode）**       | Rsbuild 编译模式（`development` / `production` / `none`） |
| **环境模式（Environment mode）** | 独立的环境文件命名空间 — 不选择构建模式                   |

## 示例与 fixtures

| 类型          | 位置                                                                                                                                                                         | 用途                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 学习示例      | [`examples/vanilla`](https://github.com/guangzan/rselectron/tree/main/examples/vanilla)、[`examples/react`](https://github.com/guangzan/rselectron/tree/main/examples/react) | 复制与学习                    |
| 回归 fixtures | `tests/fixtures/`                                                                                                                                                            | 仅供自动化测试 — 不是学习材料 |

## 相关

- [快速开始](./getting-started)
- [配置](/config/)
- [API](/api/)
