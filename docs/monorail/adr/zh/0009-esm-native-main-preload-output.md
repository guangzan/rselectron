# 0009. ESM-native Main/Preload 产物（C-native）

- Status: Accepted
- Date: 2026-07-30
- Extends: [0007-electron-role-build-contract.md](./0007-electron-role-build-contract.md)

## 背景

Rselectron 根据 Electron 能力、应用清单 `"type"` 与 `electron.format` 推导 Main/Preload 模块格式。格式为 ESM 时，Rsbuild/Rspack 会设置 `output.module: true`，默认将 `externalsType` 设为 `module-import`、倾向 `[name].mjs`，并以 `node-module` 改写 `__dirname`/`__filename`。

此前的外置路径对每个 external 强制 `` `commonjs ${request}` ``。该覆盖破坏了 Rspack 的 ESM 默认：名义 ESM 产物仍含裸 `require(...)`。在 `"type": "module"` 下，Electron 将 `.js` 当 ESM 加载并抛出 `require is not defined`。真实迁移只能靠强制 `format: 'cjs'` 与 `.cjs` 文件名绕过——作为权宜之计正确，作为产品行为不完整。

electron-vite 通过只标记 `external`、Preload ESM 强制 `.mjs`、以及 `esmShim` 兜底残留 CJS 全局，避免该不一致。Rselectron 应对齐该开箱体验，同时优先使用 Rsbuild/Rspack 原生能力。

## 决策

### 格式感知的外置

Main/Preload 依赖外置不得无条件发出 CommonJS externals。

- 角色格式为 ESM 时，将匹配请求标为 external，且不硬编码 `commonjs` 类型，以便 Rspack 使用 `module-import`（或已配置的 `externalsType`）。
- 角色格式为 CJS 时，显式使用 CommonJS externals。
- 当外置请求来自 `require` 时，使用 `node-commonjs`，使 ESM 产物通过 `createRequire` 加载，而非裸 `require`。
- 本决策不将 `externalsType: 'modern-module'` 设为默认；可在后续以 Electron 真加载证据评估。

### 入口文件名策略

ADR 0007 中的「稳定入口文件名」指 **无 hash、可被引用** 的入口名——不是永久使用 `.js` 扩展名。

当角色未设置 `output.filename` 时：

| 角色 format | 应用 `"type"` | 默认入口模式 |
| ----------- | ------------- | ------------ |
| `esm`       | 任意          | `[name].mjs` |
| `cjs`       | `module`      | `[name].cjs` |
| `cjs`       | 非 `module`   | `[name].js`  |

显式 `output.filename` 始终优先。计划中的 Main 产物继续与 Electron entry 比对；错配严重性保持现状（`dev`/`preview` 错误，`build` 警告）。危险的显式组合（ESM 或 CJS+`type:module` 却强制 `.js`）发出结构化警告并继续构建。

### 按需 ESM require shim

对 ESM Main/Preload 产物：

- `__dirname` / `__filename` 优先依赖 Rspack Node ESM 默认（`node-module`）。
- 仅当 ESM 产物图中仍存在自由 `require(` / `require.resolve(` 时，注入薄的 `createRequire(import.meta.url)` 辅助。
- 不总是注入完整的 electron-vite 风格 shim banner。

### 验收

针对 `"type": "module"` 的 Main/Preload 能力声明，需要编译期断言，以及至少一条会因 `require is not defined` 失败的 Electron 真加载路径。

## 后果

- `"type": "module"` 应用可保留推导出的 ESM，无需手写 `.cjs` 绕过。
- 默认入口扩展名可能相对早期 `.js` 假设变化；`package.json#main` 与 preload 路径须跟踪计划产物（诊断已存在）。
- 在 ESM 下断言 `require("electron")` 的外置单测须改为 ESM import / `node-commonjs` 形态。
- 文档与 inspect 输出应同时呈现 format、外置姿态与入口文件名。

## 备选方案

### 继续强制 CommonJS 外置并文档化 `.cjs` 绕过

否决：与推导 ESM 及 Rsbuild 2 Node 默认矛盾；会产生 Electron 无法加载的「成功」构建。

### 以复制 electron-vite 的 MagicString `esmShim` 作为主修复

否决作为主路径：Rspack 已提供 `externalsType`、`.mjs` 默认与 `node-module` dirname/filename。薄的按需 shim 仅作补洞。

### 默认 `externalsType: 'modern-module'`

延期：对 Node target 上将 `require` 转为 `createRequire` 有吸引力，但成为契约默认前需 Electron Main/Preload 真加载验证。
