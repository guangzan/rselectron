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

### 渲染进程看起来像 Node / Electron Renderer 目标

当渲染进程目标像 Node、`electron*-main|preload`，或显式 `electron-renderer` / `electron*-renderer` 时，Rselectron 会发出 `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`。默认沙箱路径会推导 `output.overrideBrowserslist: ['chrome >= ${min(M, 138)}']`（来自 Electron 支持快照，并按今日 browserslist-rs 上限 clamp；见 [browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48)）。随后由 Rsbuild 组装 web + browserslist 的 Rspack target。仍可显式设置 `tools.rspack.target: 'web'` 作为逃逸口。除非你有意开启 `nodeIntegration`，不要用手写 `electron*-renderer` 覆盖。

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

### CJS 主进程 / 预加载下 import-only 包失败

**代码 / 警告：** `RSELECTRON_IMPORT_ONLY_EXTERNAL`

**症状：** 主进程或预加载构建成功，但 Electron 在启动或首次使用时失败，出现 `ERR_REQUIRE_ESM`、`is not a function`，或类似对 ESM-only 模块的 `require`。常见于角色格式为 CJS，且格式感知外置对 import-only 包（或 subpath）发出了 CommonJS 外置。Rspack 可能把静态或动态 `import` 改写成 `require`；问题往往只在运行时暴露。

**主要修复（优先 Preferred ESM path）：**

1. 优先使用 `electron.format: 'esm'`，或在 `"type": "module"` 下保持 `format: 'auto'` 让 Main/Preload 推导为 ESM。若 `format: 'cjs'` 只是为了绕过 ESM-only 依赖而钉死的，请去掉。
2. 若你**有意**留在 CJS，再用 `electron.externalizeDeps.include` 把该包装进产物（见 [Electron 选项 · externalizeDeps](/config/electron#externalizedeps)）。

若你来自 electron-vite：同类失败在其文档里以 `ERR_REQUIRE_ESM` / ESM-only 依赖描述。electron-vite 的「打进包」逃逸键叫 `exclude`；在 Rselectron 中对应意图是 `include`——但只作为 CJS 侧逃逸，不是默认推荐。

Rselectron 不会自动 `include` import-only 包。bundler ignore 注释（例如 `/* webpackIgnore: true */`）仅为进阶最后手段，且不会消除 `RSELECTRON_IMPORT_ONLY_EXTERNAL`；走上 Preferred ESM path 后应移除。

## Preview

### 跳过重建

```bash
rselectron preview --skip-build
```

仅在产物已是最新时使用。
