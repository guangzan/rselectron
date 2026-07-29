<p align="center">
  <img src="./website/docs/public/rselectron-logo.png" width="150px" height="150px" alt="Rselectron">
</p>

<div align="center">
  <h1>Rselectron</h1>
</div>

<p align="center">基于 Rspack 的 Electron 工具</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@rselectron/core"><img src="https://img.shields.io/npm/v/@rselectron/core?color=6988e6&label=version" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/guangzan/rselectron?color=blue" alt="license"></a>
</p>

<p align="center">
  <a href="https://guangzan.github.io/Rselectron/zh/">文档</a> |
  <a href="https://guangzan.github.io/Rselectron/zh/guide/getting-started">快速开始</a>
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

<br />

## 特性

- ⚡️ 基于 [Rsbuild](https://rsbuild.rs) / [Rspack](https://rspack.rs)，并提供面向 Electron 的默认配置
- 🛠 主进程、预加载脚本与渲染进程统一配置入口
- 🚀 Rust 并行编译，构建更快
- 🔥 渲染进程 HMR；主进程与预加载脚本支持热重载
- 💡 针对 Electron 主进程优化的资源处理
- ✨ 多入口应用可隔离构建
- 🔌 框架无关 — Rsbuild 支持的前端框架都能用
- 📦 开箱支持 TypeScript，并提供 `inspect` 便于排查配置

## 使用

### 安装

```sh
npm i @rselectron/core -D
```

### 开发与构建

在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "dev": "rselectron dev",
    "build": "rselectron build",
    "preview": "rselectron preview"
  }
}
```

### 配置

运行 CLI 时，Rselectron 会在项目根目录解析配置文件（例如 `rselectron.config.ts`）。最小配置如下：

```ts
import { defineConfig } from '@rselectron/core';

export default defineConfig({
  main: {
    root: './src/main',
    source: { entry: { index: './index.ts' } },
  },
  preload: {
    root: './src/preload',
    source: { entry: { index: './index.ts' } },
  },
  renderer: {
    root: './src/renderer',
    source: { entry: { index: './index.ts' } },
  },
});
```

`main` / `preload` / `renderer` 各自都是完整的 Rsbuild 配置。详见[配置指南](https://guangzan.github.io/Rselectron/zh/config/)。

## 快速开始

从仓库中的示例起步：

|             示例              | 说明                                           |
| :---------------------------: | :--------------------------------------------- |
| [vanilla](./examples/vanilla) | 最小 Main / Preload / Renderer 应用            |
|   [react](./examples/react)   | 使用 `@rsbuild/plugin-react` 的 React 渲染进程 |

```bash
cd examples/vanilla
pnpm install
pnpm dev
```

完整步骤见文档站：[快速开始](https://guangzan.github.io/Rselectron/zh/guide/getting-started)。
