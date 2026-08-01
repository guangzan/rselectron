# 0010. Renderer 默认编译目标经 browserslist 钉 Electron Chromium

- Status: Accepted
- Date: 2026-07-31
- Extends: [0007-electron-role-build-contract.md](../0007-electron-role-build-contract.md)

## Context

ADR 0007 与 BUILD-005 已要求 Renderer 默认使用兼容 Electron 的 web/Chromium 目标。实现却通过共享 helper 为三个 Role 一律推导 `electron${N}-renderer`。Rspack 将 `electron*-renderer` 视为带 Node 的环境，并把 chunk 运行时挂在 `global`（`global.rspackChunk`）上。今日默认沙箱 Renderer（无 `nodeIntegration`）没有 `global`，因此即便 `output.target` 为 `web`，应用仍会以 `ReferenceError: global is not defined` 失败。

electron-vite 将 Renderer 的 `build.target` 预设为 `chrome${N}`。该 Vite/esbuild 字符串 **不是** 合法的 Rspack `AllowTarget`。Rsbuild 的原生路径是 `output.overrideBrowserslist` → `pluginTarget` → `['web', 'browserslist:…']`。

进一步约束：当前 `@rspack/binding` 的 browserslist-rs 无法解析其 DB 上限（约 **138**）之上的 Chromium major。`chrome >= 140` 一类查询会解析为空列表并导致构建失败，而 Rselectron 支持快照记录的 Electron Chromium 为 **146+**。上游跟踪：[browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48)。

## Decision

### 按 Role 的默认推导目标

当自动推导编译目标时：

| Role     | 推导值                                                                                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main     | `tools.rspack.target: 'electron${N}-main'`                                                                                                                                                                       |
| Preload  | `tools.rspack.target: 'electron${N}-preload'`                                                                                                                                                                    |
| Renderer | `output.overrideBrowserslist: ['chrome >= ${min(M, K)}']`，`M` 为支持快照中 Electron major `N` 对应的 Chromium major，**`K = 138`**（硬编码的 browserslist-rs 上限）。此路径 **不** 设置 `tools.rspack.target`。 |

当 `M > K` 时 **静默** clamp（不发诊断）。不要把 Vite 式 `chrome${M}` 写入 `tools.rspack.target`。

`output.target` 仍是 Rsbuild 环境预设（Renderer 未设置时为 `web`）。它 **不** 抑制 Chromium browserslist 推导。

### 抑制条件

当 Role 已设置 `output.overrideBrowserslist` 或 `tools.rspack.target` 时，跳过 Renderer browserslist 推导。不探测项目级 `.browserslistrc` / `package.json#browserslist`。

### 选择 Electron Renderer 目标

不提供一等 `nodeIntegration` 配置开关。需要 Electron/Node 全局的用户须显式设置编译目标（通常为 `tools.rspack.target: 'electron${N}-renderer'`）。

### 安全诊断

显式危险目标（含 `electron-renderer` 与 `electron${N}-renderer`）必须发出 `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`。默认 browserslist 路径不得发出该诊断。

### 临时 clamp 与移除

`K = 138` 是绑定今日 browserslist-rs 数据的临时产品常量。[#48](https://github.com/browserslist/browserslist-rs/issues/48)（或等价的 Rspack binding 升级）覆盖快照 Chromium major 后，去掉 clamp，改用 `chrome >= ${M}`。在此之前交付带 clamp 的默认值，使沙箱应用可构建可运行。

### 变更定性

纠正错误的 Node 向 Renderer 默认，并在当前 browserslist-rs 限制下用合法 Rspack/Rsbuild 编码。不把「沙箱 Renderer 默认期望 Node `global`」视为受支持的迁移路径。

## Consequences

- 沙箱开箱 Renderer 经 Rsbuild 的 `web` + browserslist 组合使用浏览器 chunk 运行时。
- BUILD-003 / BUILD-005 证据期望 Renderer `overrideBrowserslist: ['chrome >= ${min(M, 138)}']`（今日对支持 major 多为 `chrome >= 138`）；Main/Preload 仍为 `electron{N}-*`。
- 真正需要 Node 的 Renderer 必须显式 opt-in 并接受 risk 诊断。
- 后续在 browserslist-rs 跟上后移除 clamp。
