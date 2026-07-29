---
title: 环境
description: 构建模式、env-mode 与按进程区分的环境前缀。
---

# 环境

- `--mode` 选择 Rsbuild 构建模式：`development`、`production` 或 `none`。
- `--env-mode` 独立于构建模式，选择环境文件命名空间。
- 构建时通过 Rsbuild 环境管道加载 `RSELECTRON_`，以及按进程区分的前缀：
  - 主进程：`MAIN_RSELECTRON_`
  - 预加载：`PRELOAD_RSELECTRON_`
  - 渲染进程：`RENDERER_RSELECTRON_`

程序化加载用 `loadEnv`，行为与 CLI `--env-mode` 对齐。见 [JavaScript API](/api/javascript-api) 与 [CLI](/api/cli)。
