---
title: 排障
description: 常见问题定位与恢复指引。
---

# 排障

也可参考 [Rsbuild 排障](https://rsbuild.rs/zh/guide/troubleshooting/index) 与 [Rspack 排障](https://rspack.rs/zh/misc/faq)。

若这里的建议不够，请到 [GitHub Issues](https://github.com/guangzan/electron-rstack/issues) 搜索或提交问题。

## 技巧

1. **开发阶段** — 用断点或 `debugger` 定位问题。
2. **打包前** — 运行 `rselectron preview`，尽早发现生产构建问题。
3. **配置核对** — 用 `rselectron inspect --format human` 打印规范化配置，再排查编译或启动失败。
4. **句柄清理** — 对 `createServer` / `build` / `preview` 返回的句柄始终调用 `close()`；重复调用是安全的。

## 开发

### 找不到 Electron

**错误码：** `RSELECTRON_ELECTRON_NOT_FOUND`

请在项目根目录安装 Electron（或确保清单能解析到项目本地安装）。Rselectron 不会代为下载 Electron。支持的版本范围见 [兼容性](./compatibility)。

### 缺少 main / preload / renderer 配置

**错误码 / 警告：** `RSELECTRON_ROLE_MISSING`

有意省略某一进程是允许的。若你期望它参与构建，请在 `defineConfig` 中补上对应键。

### `--renderer-only` 无法启动

`--renderer-only` 会跳过主进程与预加载构建，复用此前产物。需要先完整跑过至少一次 `rselectron dev`（或 `build`），且主进程 / 预加载输出仍在且通过校验。改动主进程或预加载源码后，不要继续用该选项。

### 渲染进程看起来像 Node 目标

当渲染进程输出目标像 Node / Electron-main 时，会发出 `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`。除非你有意启用 `nodeIntegration`，否则请使用面向浏览器的渲染进程目标。

## 构建

### `build` 拒绝 watch

生产 `build` 是有限次构建，不支持按进程选择性 watch。主进程 / 预加载热重载请使用：

```bash
rselectron dev --watch
# 或
rselectron dev --watch=main
rselectron dev --watch=preload
```

## 预览

### 想跳过重新构建

```bash
rselectron preview --skip-build
```

仅在产物已是最新时使用。
