---
title: 兼容性
description: Electron 版本、宿主、框架与有意排除项。
---

# 兼容性

Rselectron 以冻结的 electron-vite 基线为目标做**能力对等**，并受已文档化的**对等例外**约束。这**不是** Vite 配置、插件或 electron-vite API 的直接替换。验收记录见仓库 [兼容性矩阵](https://github.com/guangzan/rselectron/blob/main/docs/monorail/compatibility-matrix.md)。

## Electron 版本

Rselectron 在每次发布时冻结一个 Electron 支持窗口：下限固定为 Electron **28**（首个支持 ESM 的 major），上限为发布时当前的三个稳定 major（今天为 **43**），随每次发布向上滚动。当前窗口为 **28–43**，可选 peer 范围为 `>=28 <44`。发布元数据、文档与 CI 使用同一冻结窗口；发布后不再漂移。

也可从包中读取：

```ts
import { ELECTRON_SUPPORT_SNAPSHOT } from '@rselectron/core';
```

## Rsbuild 版本

`@rsbuild/core` 是应用声明的**必需项目 peer**（安装契约 `^2.0.0`）。npm 7+ 与 pnpm 8+ 会自动安装必需 peer，因此只有在其他包管理器（例如 yarn classic 或 bun，以及任何禁用自动安装的布局）下才需要手动声明。

每次 Rselectron 发布还会冻结一个 **Rsbuild 已测窗口**：即该发布版本所测试的 `@rsbuild/core` 版本的 minor 线（测试 `2.1.7` → 窗口 `>=2.1.0 <2.2.0`）。已测 minor 线内的 patch 更新视为安全，不产生任何输出。项目本地的 `@rsbuild/core` 越窗时，`dev`、`build`、`inspect` 与 `preview` 都会产生仅警告的 `RSELECTRON_RSBUILD_UNTESTED` 诊断——绝不会是硬错误，因为应用拥有自己的构建工具。这与上方 [Electron 版本](#electron-版本) 窗口的语义相反：那里越窗版本会被硬拒绝，因为 Rselectron 要从逐 major 的 Electron 运行时元数据推导编译目标。

## 宿主与打包

宿主覆盖有 CI 硬件的 macOS、Linux 与 Windows（x64 / arm64）。宿主支持**不**意味着原生 addon 可交叉编译。

Rselectron 只覆盖开发与源码构建。用 electron-builder、Electron Forge 等消费产物是预期用法；Rselectron 不产出安装包。

## 框架

官方示例如 [`examples/`](https://github.com/guangzan/rselectron/tree/main/examples) 下的 Vanilla 与 React。其他 UI 框架通过常规 Rsbuild 插件即可。Rselectron 不维护单独的框架矩阵。

## 有意排除（对等例外）

相对 electron-vite，以下能力有意不在范围内：

| 能力                        | Rselectron 立场                             |
| --------------------------- | ------------------------------------------- |
| Vite 插件                   | 不接受、不翻译 — 请用 Rsbuild / Rspack 插件 |
| V8 字节码编译（bytecode）   | 未实现 — 无静默回退                         |
| electron-vite 的 SWC helper | 不导出 — 通过 Rsbuild / Rspack 自行配置 SWC |

迁移语义对照见 [迁移](./migration)。
