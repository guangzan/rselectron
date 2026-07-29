---
title: 兼容性
description: Electron 版本、宿主、框架与有意排除的能力。
---

# 兼容性

## Electron 版本

当前支持的 Electron 主版本为 **41–43**，可选 peer 范围为 `>=41 <44`。发布元数据、文档与 CI 使用同一范围。

也可从包中读取：

```ts
import { ELECTRON_SUPPORT_SNAPSHOT } from 'electron-rstack';
```

## 宿主与打包

宿主覆盖有 CI 硬件可用的 macOS、Linux、Windows（x64 / arm64）。宿主支持**并不**意味着原生 addon 可交叉编译。

Rselectron 只负责开发与源码构建。用 electron-builder、Electron Forge 等工具消费产物是预期行为；Rselectron 不生成安装包。

## 框架

Vanilla 与 React 是官方示例。其他 UI 框架可通过常规 Rsbuild 插件使用。Rselectron 不维护单独的框架矩阵。

## 有意排除的能力

相对 electron-vite，以下能力有意不提供：

| 能力 | Rselectron 立场 |
| --- | --- |
| Vite 插件 | 不接受也不翻译 — 使用 Rsbuild / Rspack 插件 |
| V8 字节码编译 | 不实现 — 无静默回退 |
| electron-vite 导出的 SWC helper | 不导出 — 使用 Rsbuild / Rspack 原生 SWC 配置 |

详见仓库 [兼容性矩阵](https://github.com/guangzan/rselectron/blob/main/docs/monorail/compatibility-matrix.md) 与 [迁移](./migration)。
