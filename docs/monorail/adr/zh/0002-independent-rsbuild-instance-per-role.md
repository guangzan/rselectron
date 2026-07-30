# 0002. 每个 Role 使用一个独立的 Rsbuild 实例

- Status: Accepted
- Date: 2026-07-24

## Context

Electron 应用具有 Main、Preload 与 Renderer 三种源码构建 Role。它们需要不同的入口、目标、格式、externalize 规则、输出目录与开发行为。

Rsbuild 的 environment 配置并不等同于三份完整的 Rsbuild 配置：诸如 root 与 server 等实例级关注点无法按 environment 自由变化。因此若将 Role 建模为同一编译器的 environments，对「每个 Role 拥有完整配置」的承诺就会失真。

Rselectron 还在应用级与 Role 级拥有 Electron 特有选项。名为 `electron` 的 Role 级字段会扩展、但不属于传给 Rsbuild 的 Rsbuild 配置。

## Decision

Rselectron 为每个已配置的 Role 创建一个独立的 Rsbuild 实例。生产环境下的 Role 构建可并发运行；单一 multi-compiler 不是核心编排模型。

公开配置具有外层的 `main`、`preload` 与 `renderer` Role 键。每个 Role 值接受完整的 Rsbuild 配置表面，外加由 Rselectron 拥有的 `electron` 扩展。在创建 Rsbuild 实例之前，Rselectron 会将该 Role 的 `electron` 扩展与 Rsbuild 配置分离。这使得诸如 `root` 等实例选项可按 Role 独立，并防止自定义字段泄漏进 Rsbuild。

「接受完整的 Rsbuild 配置」描述的是配置表面，而非承诺对每个 Role 调用每一项 Rsbuild 操作。Server 选项仅在 Rselectron 为该 Role 启动开发服务器时生效；标准生命周期只为 Renderer 启动一个，而 Main 与 Preload 使用 build/watch。

应用级的启动与发现选项位于顶层 `electron` 键下，包括 `packageJson`、启动 `entry`、`execPath`、进程 `args` 与 `restartDebounce`。Role 级 `electron` 包含源码构建与更新行为，例如 `externalizeDeps`、`isolatedEntries`、`watch` 与 `format`。不存在隐式的 `shared` 块。用户通过导出的 merge 辅助函数显式组合公共配置。

Rselectron 配置模块在每次编排 generation 中只加载一次。被监视的配置依赖发生变化时，会关闭所有 Role 实例与 Electron 进程，重新加载该模块一次，重建每一个已配置 Role，并仅在所需的初始构建与 renderer server 就绪后启动新的开发会话。

默认只发现 `rselectron.config.{ts,js,mts,mjs,cts,cjs}`。显式配置路径可选择其他文件名。加载委托给 Rsbuild 2 的配置加载器，默认使用 `auto`，并通过 `--config-loader` 暴露相同的 `auto`、`jiti` 与 `native` 选项。Rselectron 提供自己的配置文件名列表，以免意外发现 Rsbuild 配置文件。

配置函数接收 `{ command, mode, envMode }`：

- `command` 为 `dev`、`build`、`preview` 或 `inspect`。
- `mode` 保留 Rsbuild 的 `development`、`production` 或 `none` 语义。
- `envMode` 独立于构建 mode 选择环境文件。

两个 merge API 有意覆盖不同领域：

- `mergeRselectronConfig` 组合外层 Role 与感知 Electron 的配置。
- `mergeRsbuildConfig` 是针对 Role 配置的 Rsbuild merge 操作，并保留 Rsbuild 的函数/插件 merge 行为。

环境加载遵循 Rsbuild 的丰富结果模型，而非返回扁平记录。默认公共前缀为 `RSELECTRON_`、`MAIN_RSELECTRON_`、`PRELOAD_RSELECTRON_` 与 `RENDERER_RSELECTRON_`；仅 `RSELECTRON_RENDERER_URL` 保留给开发态 renderer URL。`rselectron/node` 类型入口在 `ProcessEnv` 上声明该变量，以便 Main 与 Preload 代码无需应用自有 ambient 声明即可使用。

## Consequences

- 每个 Role 可使用完整的 Rsbuild 配置及自己的 root；仅影响该 Role 所用操作的选项才会生效。
- 同一属性名 `electron` 在顶层与 Role 内有意具有不同作用域。
- 类型定义必须明确扩展字段，规范化必须在调用 Rsbuild 前将其移除。
- 配置重启在所有 Role 间协调；不支持配置的局部热替换。
- 相较于单一编译器，内存与启动成本可能更高，但编排与失败隔离更清晰。
- Main 与 Preload 的 `server` 设置作为完整 Rsbuild 表面的一部分被接受，但在标准 build/watch 生命周期中无运行时效果；规范化会发出 Role 感知的诊断，而非静默暗示存在 server。
- Rsbuild 加载器报告的配置依赖定义受控的全量重启监视集。
- 构建 mode 与环境文件选择不会意外相互覆盖。

## Alternatives considered

### 将 Role 建模为同一实例中的 Rsbuild environments

拒绝，因为 environment 级配置无法表达承诺的每 Role 实例设置。

### 增加隐式的 shared 配置块

拒绝，因为 merge 顺序与数组/插件语义会变成第二套配置组合系统。显式 merge 辅助函数使组合可见。

### 将 Rsbuild 嵌套在 `role.rsbuild` 下

拒绝，因为这增加仪式感，并偏离熟悉的外层 Role 形状。规范化边界已足够，前提是有类型与测试。

### 发现 `rsbuild.config.*` 或 `electron.vite.config.*`

拒绝，因为多个隐式配置权威会使启动与重启行为含糊。

### 使用一个通用的 merge 辅助函数

拒绝，因为外层 Rselectron 语义与内层 Rsbuild 插件/函数语义是不同契约。
