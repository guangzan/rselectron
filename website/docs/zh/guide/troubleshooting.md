---
title: 故障排除
description: 常见失败如何诊断与恢复。
---

# 故障排除

也可参阅 [Rsbuild 故障排除](https://rsbuild.rs/guide/troubleshooting/index) 与 [Rspack FAQ](https://rspack.rs/misc/faq)。

若仍不够，请在 [GitHub](https://github.com/guangzan/rselectron/issues) 搜索或开 issue。

## 提示

1. **开发中** — 使用断点或 `debugger`。
2. **打包前** — 先跑 `rselectron preview`，尽早发现生产构建问题。
3. **核对配置** — 追编译或启动失败前，先跑 `rselectron inspect --format human`。Inspect 展示规范化、Rsbuild 与 Rspack 三层 — 见 [JavaScript API · inspect](/api/javascript-api#inspect) 与 [CLI](/api/cli)。
4. **关闭句柄** — 对 `createServer` / `build` / `preview` 返回的句柄务必调用 `close()`；重复调用是安全的。

## 开发

### 找不到 Electron

**代码：** `RSELECTRON_ELECTRON_NOT_FOUND`

在项目根安装 Electron（或确保所选清单能解析到项目本地安装）。Rselectron 不会替你下载 Electron。受支持版本见 [兼容性](./compatibility)。

### 缺少 main / preload / renderer 配置

**代码 / 警告：** `RSELECTRON_ROLE_MISSING`

有意省略某一进程是允许的。若你期望它被构建，请在 `defineConfig` 下补上对应键。见 [主进程、预加载与渲染进程](/config/processes)。

### `--renderer-only` 无法启动

`--renderer-only` 会跳过主进程与预加载构建，并复用既有产物。请先至少完整跑过一次 `rselectron dev`（或 `build`），并保持这些产物有效。改动主进程 / 预加载源码后不要继续用该旗标。旗标说明见 [CLI](/api/cli)。

### 渲染进程看起来像 Node 目标

当渲染进程输出目标像 Node / Electron-main 时，Rselectron 会发出 `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`。除非你有意开启 `nodeIntegration`，请使用面向浏览器的渲染目标。

### 配置变更会整会话重启

被监视的配置依赖变化会重新加载整个配置世代并替换开发会话。不支持配置的局部热替换 — 见 [概念](./concepts)。

## 构建

### `build` 拒绝 watch

生产 `build` 是一次性的，不支持按进程选择的 watch（`RSELECTRON_BUILD_WATCH_UNSUPPORTED`）。主进程 / 预加载热重载请用：

```bash
rselectron dev --watch
# 或
rselectron dev --watch=main
rselectron dev --watch=preload
```

见 [CLI](/api/cli)。

## Preview

### 跳过重建

```bash
rselectron preview --skip-build
```

仅在产物已是最新时使用。
