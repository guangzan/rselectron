<picture>
  <img alt="Rselectron Banner" src="./website/docs/public/rselectron-banner.png">
</picture>

# Rselectron

<p>
  <a href="https://guangzan.github.io/rselectron/zh/"><img src="https://img.shields.io/badge/docs-website-blue?style=flat-square&colorA=564341&colorB=EDED91" alt="documentation" /></a>
  <a href="https://www.npmjs.com/package/@rselectron/core"><img src="https://img.shields.io/npm/v/@rselectron/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@rselectron/core.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="node version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" /></a>
</p>

[English](./README.md) | 简体中文

Rselectron 是面向 Electron 的 Rsbuild 优先开发与构建工具。用 Rsbuild / Rspack 做 Electron 的开发与源码构建。

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
npm i @rselectron/core @rsbuild/core -D
```

`@rsbuild/core` 是必需的 peer 依赖（npm 7+ / pnpm 8+ 会自动安装）。当安装的 Rsbuild minor 超出该发布版本的已测窗口时，Rselectron 只会警告——绝不会阻塞。

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

`main` / `preload` / `renderer` 各自都是完整的 Rsbuild 配置。详见[配置指南](https://guangzan.github.io/rselectron/zh/config/)。

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

完整步骤见文档站：[快速开始](https://guangzan.github.io/rselectron/zh/guide/getting-started)。
