# Rselectron

Rselectron 是面向 Electron 的 Rsbuild 优先开发与构建工具。

当前 beta：**1.0.0-beta.1**（发布后可用 `npm install @rselectron/core@1.0.0-beta.1`，或从打包 tarball 安装）。

English README: [README.md](./README.md)。完整文档站点见 [`website/`](./website/)。

## CLI 契约

- `rselectron --help` 打印可用选项。
- `rselectron --version` 打印包版本。
- `rselectron build` 对每个已配置的 Main、Preload、Renderer Role 执行一次有限生产构建。接受 `--config`、`--config-loader`、`--mode`、`--env-mode`；拒绝 watch 模式。
- `rselectron inspect` 打印规范化的 Role、最终 Rsbuild 与 Rspack 配置（`--format json|human`），不构建也不启动 Electron。
- `rselectron preview` 构建生产输出（除非 `--skip-build`）并启动项目本地 Electron。
- `rselectron dev --watch` 让 Main 与 Preload 参与重建；`--watch=main` / `--watch=preload` 显式选择 Role 并覆盖 `electron.watch`。
- `rselectron dev --renderer-only` 复用已校验的 Main/Preload 输出。
- 被监听的配置依赖发生变化时，会在一次配置重载后替换完整 Development 世代（Roles、Renderer 服务器与 Electron）。
- 不带显式命令运行 `rselectron` 时，向 stderr 打印 `No command specified.` 与帮助，并以状态码 1 退出，不启动 Electron。

省略某个 Role 会产生 `RSELECTRON_ROLE_MISSING` 警告，不会阻止已配置 Role 构建。

## 编程 API

ESM API 导出 `build`、`createServer`、`defineConfig`、`inspect`、`preview`、`loadEnv`、`mergeRselectronConfig`、`mergeRsbuildConfig`、`ELECTRON_SUPPORT_SNAPSHOT`、`resolveProjectElectron`、`RselectronError` 与 `version`。
`build()` 返回按 Role 的统计与输出路径，以及幂等的 `close()`。
`createServer()` 返回 Renderer URL、Electron 子进程，以及幂等的 `close()`。
当需要推导 Role 格式或编译器 target 时，会从 Application root 对照冻结支持快照解析 Electron。
Role 构建通过 Rsbuild 环境管道加载 `RSELECTRON_` 与 Role 作用域前缀。
`@rselectron/core/node` 声明 `RSELECTRON_RENDERER_URL` 以及 `?asset` / `?asset&asarUnpack` / `?modulePath` / `?nodeWorker` / `*.wasm?loader` / `*.node` 等模块形态。
Core 与 CLI 仍是私有实现包。

## 文档与示例

- 双语文档站：`website/`（`pnpm docs:dev` / `pnpm docs:build`）
- 领域词汇：[`docs/monorail/CONTEXT.md`](./docs/monorail/CONTEXT.md) / [`docs/monorail/CONTEXT.zh.md`](./docs/monorail/CONTEXT.zh.md)
- 兼容性矩阵：[`docs/monorail/compatibility-matrix.md`](./docs/monorail/compatibility-matrix.md)
- 学习示例：[`examples/`](./examples/)（与 `tests/fixtures/` 分离）
