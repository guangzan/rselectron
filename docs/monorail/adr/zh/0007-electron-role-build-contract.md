# 0007. 确立 Electron Role 构建契约

- Status: Accepted
- Date: 2026-07-24

## Context

完整的 Rsbuild 配置有意保持灵活，但 Electron Role 仍需要可预测的入口、输出路径、运行时目标、模块格式与 externalization。若无 Role 契约，配置可能构建成功，却产生 Electron 无法安全启动或 preload 的文件。

electron-vite 6.0.0-beta.1 提供有用的行为参考：约定式的 `src/main`、`src/preload` 与 `src/renderer` 输入；按 Role 的 `out` 目录；Electron 与 Node builtin 的 externalization；稳定的 Node 入口文件名；通过底层 web 构建器支持 renderer 多页；以及基于 query 的资产、worker、模块路径、WebAssembly 与原生模块处理。

## Decision

### Role 发现与输出

默认输入为：

- Main: `src/main/index.{js,ts,mjs,cjs}`
- Preload: `src/preload/index.{js,ts,mjs,cjs}`
- Renderer: `src/renderer/index.html`

默认输出为 `out/main`、`out/preload` 与 `out/renderer`。缺失的 Role 会发出警告并跳过该 Role，除非警告被显式忽略。Renderer 多页输入通过单一 Renderer Rsbuild 配置完成；Rselectron 不创建窗口配置层。

Main 与 Preload 入口文件名保持稳定（无 hash、可引用），因为 `package.json#main`、preload 路径、worker 路径与打包器配置可能引用它们。稳定性并不把扩展名冻结为 `.js`；默认扩展名遵循 [ESM-native Main/Preload 产物契约](./0009-esm-native-main-preload-output.md)。其非入口 chunk 与资产使用内容哈希。Renderer 输出遵循正常的 Rsbuild web 命名与哈希。

### 应用清单与启动入口

应用根目录选择默认应用清单；`electron.packageJson` 可选择另一清单。对 `dev` 与 `preview`，除非 CLI 或配置提供显式入口覆盖，清单的 `main` 字段是权威的 Electron 入口。

Rselectron 规范化预期的 Main 输出，并与启动入口比较。不匹配在 `dev` 与 `preview` 中是结构化启动错误，因为启动陈旧或不相关代码不安全。`build` 将不匹配报告为警告，因为源码输出可能有意由后续重写清单的打包步骤消费。

### 预设、目标与格式

Main 与 Preload 预设默认使用项目本地 Electron 的 Node 目标，不 minify，并根据 Electron 能力、包类型与 Role 级 `electron.format` 推导 `cjs` 或 `esm`。Renderer 使用对应的 Chromium browserslist 默认（来自支持快照的 `overrideBrowserslist: ['chrome >= ${M}']`）与正常的 web 优化；详见 [0010-renderer-chrome-compiler-target.md](./0010-renderer-chrome-compiler-target.md)。

用户可覆盖 Role 预设，但 Rselectron 对 Role 身份进行硬验证：

- Main 与 Preload 必须有入口、兼容的 Node 目标、有效的模块格式，以及强制的 Electron/Node externals。
- Renderer 必须有 HTML 或显式配置的入口。其支持的默认是兼容 Electron 的 web/Chromium 目标。高级目标覆盖仍可通过 Rsbuild/Rspack 获得，但非 web 目标会发出安全与兼容性诊断，因为它们通常暗示 Renderer 代码中的 `nodeIntegration` 或 Electron 全局变量。
- 应用清单或 preload 引用所需的入口文件名必须保持稳定。

### Externalization 与孤立入口

`electron`、Electron 子路径、Node builtins 与 `node:` builtins 在 Main 与 Preload 中始终为 external。应用 `dependencies` 默认 external，并提供显式的 include 与 exclude 控制。

Preload 与 Renderer 的 `electron.isolatedEntries` 是稳定功能。它们产生可独立执行、无共享 chunk 的入口。当为 Preload 启用且 `externalizeDeps` 未显式指定时，依赖 externalization 默认为 `false`，使沙箱化 preload 入口自包含。显式冲突的 Preload 设置会被保留，但会发出诊断。Renderer 孤立不改变依赖 externalization。

### Electron 资源导入

Rselectron 保留以下公开导入形式：

- `?asset`
- `?asset&asarUnpack`
- `?nodeWorker`
- `?modulePath`
- `*.wasm?loader`
- 原生 `.node` 模块

其声明从 `rselectron/node` 导出。应用 `resources` 目录是默认资源位置，但源码构建不会自动复制整个目录；打包工具拥有最终资源布局。

装饰器元数据使用 Rsbuild/Rspack 的原生 SWC 配置。Rselectron 不导出单独的 SWC 辅助工具。仅接受 Rsbuild 插件。

### 仅 Renderer 开发

仅 Renderer 开发仅在验证所有必需的 Main 与 Preload 输出已存在且匹配规范化的启动/preload 路径之后，才跳过 Main 与 Preload 编译。它从不静默地在缺失产物的情况下启动。

## Consequences

- 约定式项目几乎无需配置，而自定义 Rsbuild 项目仍保留完整 Role 表面。
- 硬验证防止成功但不可运行的 Electron 输出。
- 稳定入口名与可缓存的 chunk 与资产并存。
- 可引用原生模块，但 Rselectron 不交叉编译或打包它们。
- Query 形式与 `rselectron/node` 是长期公开 API。
- Role 感知诊断区分无害的未使用设置与无效的 Electron 输出。
- 高级 Renderer 目标覆盖超出默认安全配置，并带有显式诊断，而非被静默拒绝。

## Alternatives considered

### 使每个预设值都可自由覆盖

拒绝，因为无效的目标、格式、入口或 builtin 捆绑可能产生仅在 Electron 启动后才失败的输出。

### 在源码构建期间复制整个 resources 目录

拒绝，因为源码编译不知道最终打包器布局，且会重复打包行为。

### 将每个 renderer 页面或窗口建模为一个 Role

拒绝，因为 Rsbuild 已支持多页 web 输出，且 Electron 窗口生命周期属于应用。

### 将孤立的 Preload 或 Renderer 入口设为实验性

拒绝，因为可独立执行的 Preload 与 Renderer 入口是冻结能力契约的一部分。
