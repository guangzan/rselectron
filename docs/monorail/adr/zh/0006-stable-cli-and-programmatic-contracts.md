# 0006. 定义明确的 CLI 与编程式契约

- Status: Accepted
- Date: 2026-07-24

## Context

Rselectron 既是命令行工具，也是供更高层工具使用的库。隐式命令、仅 CLI 的行为，或非结构化失败，会使自动化含糊，并迫使集成方解析日志。

electron-vite 6.0.0-beta.1 将根命令视为开发，并同时别名为 `serve` 与 `dev`，使用 camel-case 长选项，且其编排 API 返回 `void`。Rselectron 有意需要更严格、感知生命周期的契约。

## Decision

CLI 要求一个显式子命令：

- `dev` 启动开发会话。
- `build` 执行有限的生产源码构建。
- `preview` 除非存在 `--skip-build`，否则先构建，然后启动 Electron。
- `inspect` 解析配置，不启动 Electron，也不产生应用输出。

长选项仅使用 kebab-case。没有隐藏的 camel-case 别名，也没有隐式默认命令。`build` 不支持 watch 模式。

`--mode` 选择 Rsbuild 构建 mode，`--env-mode` 独立选择环境文件。`dev --watch` 同时启用 Main 与 Preload 监视；`dev --watch=main`、`dev --watch=preload` 与 `dev --watch=main,preload` 显式选择 Role，并覆盖该会话的 Role 级 `electron.watch`。Renderer 监视仍隐含在其开发服务器中，不是该选项可接受的值。`dev --renderer-only` 复用已验证的 Node Role 输出，`preview --skip-build` 复用生产输出，`--config-loader` 选择 Rsbuild 支持的配置加载器。这些标志投射 ADR 0002 与 0003 中的配置与生命周期契约，而非定义替代行为。

公开编程式 API 为：

- `defineConfig`
- `createServer`
- `build`
- `preview`
- `loadEnv`
- `mergeRselectronConfig`
- `mergeRsbuildConfig`

`createServer` 返回包含 `urls`、`electronProcess` 与幂等 `close` 的生命周期句柄。`build` 返回每 Role 的 `stats`、输出 `paths`，以及对插件或编译器保留资源的幂等 `close`。`preview` 返回 `buildResult`、`electronProcess` 与幂等 `close`。

CLI 命令是同一编程式操作与规范化流水线之上的适配器；它们不维护第二套行为实现。

`inspect` 为每个已配置 Role 暴露三层：

1. 规范化后的 Rselectron 配置；
2. 预设与 merge 之后的最终 Rsbuild 配置；
3. 最终 Rspack 配置。

Inspect 输出会脱敏名称或值被归类为敏感的环境变量所产生的值。人类可读与机器可读输出使用同一脱敏数据模型。

所有操作失败使用 `RselectronError(code, role, cause, hint)`。Codes 是稳定的机器标识符，`role` 标识 Main、Preload、Renderer、Electron 或编排作用域，`cause` 保留原始失败，`hint` 提供可操作的纠正。CLI 退出码与消息是该错误的投射，而非单独的错误类型。

## Consequences

- 脚本可区分命令与失败，而无需解析散文。
- 集成方可拥有会话关闭，并检查子进程状态。
- CLI 与库行为保持一致。
- Inspect 输出成为兼容性与支持表面，因此敏感信息脱敏 fixture 是强制的。
- 增加别名或更改句柄字段需要正常的公开 API 兼容性审查。

## Alternatives considered

### 保留隐式开发命令

拒绝，因为缺少子命令可能在自动化中意外启动 Electron。

### 为兼容性提供 camel-case 别名

拒绝，因为 Rselectron 不声称 CLI drop-in 兼容，且重复拼写会成为永久表面。

### 返回 `void` 并依赖进程全局关闭

拒绝，因为嵌入式工具需要 URL、子进程访问、构建结果与确定性清理。

### Inspect 仅暴露规范化后的 Rselectron 配置

拒绝，因为插件与预设问题往往只在最终 Rsbuild 或 Rspack 配置中显现。
