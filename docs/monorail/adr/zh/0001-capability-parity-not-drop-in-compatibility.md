# 0001. 以能力对等为目标，而非 drop-in 兼容

- Status: Accepted
- Date: 2026-07-24

## Context

electron-vite 是产品参考对象，但其公开表面与 Vite 耦合，并包含若干不适合以 Rsbuild 为先的工具的能力。若将目标称为「完全兼容」，会暗示配置、插件与 API 可互换，而这并非 Rselectron 所提供的。

当前可用的参考检出是 electron-vite 6.0.0-beta.1。其配置暴露 Main、Preload 与 Renderer 的 Vite 配置，实现中包含 Vite 插件、字节码支持，以及导出的 SWC 辅助工具。

## Decision

Rselectron 通过版本化的 [electron-vite 兼容性矩阵](../../compatibility-matrix.md) 追求能力对等，而非 drop-in 兼容。

矩阵基线冻结在 electron-vite 6.0.0 final。在 final 可用之前，以 6.0.0-beta.1 作为临时矩阵来源。Vite 插件、字节码编译，以及 electron-vite 的 SWC 辅助工具被记录为对等例外。

Rselectron 只接受并导出 Rsbuild 插件。Electron 生命周期行为由 Rselectron 拥有，不作为单独的插件协议暴露。

在 1.0 之前，发布可使用 alpha 或 canary 通道。「1.0 对等」意味着每个适用的矩阵条目均已实现，每个排除条目均有明确文档；并不意味着与 electron-vite 完全兼容。

Rselectron 只拥有源码开发与源码构建。应用打包仍由 electron-builder、Electron Forge 等工具负责。项目脚手架是独立的、核心之后的里程碑，不属于 1.0 构建工具契约。

Renderer 多页应用在单一 Renderer Role 内使用 Rsbuild 的 HTML 与多页能力。Rselectron 不引入具名窗口作为领域对象。

## Consequences

- 迁移文档必须描述语义映射与例外，而不能承诺配置文件替换。
- 兼容性主张可对照稳定矩阵进行测试。
- 基线冻结后，electron-vite 的新能力不会静默扩大 Rselectron 的范围。
- Rsbuild 仍是原生扩展表面。
- 打包集成与 Rselectron 输出组合使用，而不会成为 Rselectron 的子系统。
- 窗口生命周期与路由仍属应用职责。

## Alternatives considered

### 提供 drop-in 的 electron-vite 替代品

拒绝，因为接受 Vite 配置与插件会破坏以 Rsbuild 为先的边界，并产生两套互不兼容的扩展模型。

### 声称完全对等，同时列出例外

拒绝，因为「完全对等」与有意排除相矛盾，会使 1.0 验收标准含糊不清。

### 将打包与脚手架纳入核心产品

拒绝，因为源码编译、可分发包与项目生成具有不同的生命周期与扩展生态。
