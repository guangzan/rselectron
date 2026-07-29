<p align="center">
  <img src="./website/docs/public/rselectron-logo.png" width="150px" height="150px" alt="Rselectron">
</p>

<div align="center">
  <h1>Rselectron</h1>
</div>

<p align="center">Electron tooling on Rspack</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@rselectron/core"><img src="https://img.shields.io/npm/v/@rselectron/core?color=6988e6&label=version" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/guangzan/rselectron?color=blue" alt="license"></a>
</p>

<p align="center">
  <a href="https://guangzan.github.io/Rselectron/">Documentation</a> |
  <a href="https://guangzan.github.io/Rselectron/guide/getting-started">Getting Started</a>
</p>

<p align="center">
  <a href="./README.zh.md">简体中文</a>
</p>

<br />

## Features

- ⚡️ [Rsbuild](https://rsbuild.rs) / [Rspack](https://rspack.rs) powered, with Electron-oriented defaults
- 🛠 Single config for main, preload, and renderer
- 🚀 Fast builds with Rust-based parallel compilation
- 🔥 Renderer HMR, plus hot reload for main and preload
- 💡 Asset handling tuned for the Electron main process
- ✨ Isolated builds for multi-entry Electron apps
- 🔌 Framework agnostic — use any UI stack your Rsbuild setup supports
- 📦 Out-of-the-box TypeScript support, plus `inspect` for debugging config

## Usage

### Install

```sh
npm i @rselectron/core -D
```

### Development & Build

Add npm scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "rselectron dev",
    "build": "rselectron build",
    "preview": "rselectron preview"
  }
}
```

### Configuration

When you run the CLI, Rselectron resolves a config file at the project root (for example `rselectron.config.ts`). A minimal config looks like this:

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

Each of `main` / `preload` / `renderer` is a full Rsbuild config. See the [configuration guide](https://guangzan.github.io/Rselectron/config/) for details.

## Getting Started

Start from a learning example in this repository:

|            Example            | Description                                 |
| :---------------------------: | :------------------------------------------ |
| [vanilla](./examples/vanilla) | Minimal Main / Preload / Renderer app       |
|   [react](./examples/react)   | React renderer with `@rsbuild/plugin-react` |

```bash
cd examples/vanilla
pnpm install
pnpm dev
```

Full walkthrough: [Getting Started](https://guangzan.github.io/Rselectron/guide/getting-started).
