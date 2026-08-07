# 0012. Rsbuild 保持为必需项目 peer，附带 warn-only 已测窗口

- Status: Accepted
- Date: 2026-08-07
- Related: [0002-independent-rsbuild-instance-per-role.md](../0002-independent-rsbuild-instance-per-role.md), [0005-electron-is-an-optional-project-peer.md](../0005-electron-is-an-optional-project-peer.md)

## Context

`@rselectron/core` 将 `@rsbuild/core: ^2.0.0` 声明为**必需** peer 依赖并静态 import（`createRsbuild`、`loadConfig`、类型）——Rsbuild 是 Rselectron 每次操作的引擎，不同于作为 optional peer 的 Electron。围绕该依赖的打包方式有两个实际痛点：

- **安装摩擦**：应用必须自行安装 `@rsbuild/core`，多出一步手动操作（主要影响 yarn classic / bun，以及任何关闭自动安装的严格布局）。
- **版本漂移**：`^2.0.0` peer 范围允许任意 2.x 版本，而 Rselectron 内部只针对一个固定版本测试。更新的 Rsbuild minor 可能在 Rselectron 脚下改变行为。

针对两者的直截了当的解法——把 `@rsbuild/core` 变成 exact-pin 的直接依赖（内置）——在插件生态面前失效。`@rsbuild/plugin-react`（旗舰示例）在运行时 `import { rspack } from '@rsbuild/core'`，整个插件生态把 `@rsbuild/core` 声明为从应用树解析的（optional）peer。若改为直接依赖，使用插件的应用仍然需要安装 `@rsbuild/core`（pnpm 严格布局无法把插件的 peer 解析到 `@rspack/rselectron` 之下的嵌套副本），结果是**两份** Rsbuild 且 Rspack 版本可能分叉：重复的原生 binding 下载，以及 Rselectron 实例与插件栈 `rspack` 之间的新身份分裂。把 Rsbuild 打包进发布产物也不可行：它携带 `@rspack/binding` 原生二进制与打包器无法 vendoring 的动态资源/worker 文件。

必需 peer 模型是唯一能保证 Rselectron、应用配置与插件生态共享**同一份** Rsbuild 实例的形态——这与 ADR 0002「接受完整 Rsbuild 配置面」的哲学一致。与 Electron（ADR 0005）不同，这里没有「应用拥有运行时」的论据来强制 peer：Rsbuild 是构建工具而非被启动的运行时。保留 peer 是出于插件生态的单一身份要求，而非与 Electron 类比。

## Decision

`@rsbuild/core` 继续作为公共 facade 的**必需 peer 依赖**，并新增一个 **warn-only 已测窗口诊断**来治理版本漂移：

- 每个 Rselectron 发布版本冻结一个 **Rsbuild 已测窗口**：该发布版开发依赖集所固定 `@rsbuild/core` 版本的 minor 线（测试 `2.1.7` → 窗口 `>=2.1.0 <2.2.0`）。已测 minor 线内的 patch 级更新视为安全、不产生诊断。
- `dev`、`build`、`inspect`、`preview` 解析项目本地的 `@rsbuild/core`（peer 模型下即 Rselectron 自己 import 的那份）并读取其版本。越窗时输出结构化 warn 级诊断；绝不阻断运行。
- peer 范围保持 `^2.0.0`——安装契约刻意宽于已测窗口。Rselectron 不拒绝、不阻止应用使用更新的 Rsbuild；只报告该版本未经本次 Rselectron 发布版测试。
- 窗口随发布冻结在发布元数据中（与 `ELECTRON_SUPPORT_SNAPSHOT` 并列），保证已发布的 Rselectron 版本有可复现的诊断。
- 这是 Electron 快照策略（ADR 0011）的反面：Electron 越窗被硬拒绝，因为 Rselectron 要从逐 major 运行时元数据推导编译目标；Rsbuild 越窗只警告，因为应用拥有自己的构建工具，失败面是应用自己的构建。
- 安装摩擦不靠打包解决：文档与示例显式声明 `@rsbuild/core` 依赖（npm 7+ 与 pnpm 8+ 默认已自动安装必需 peer）。

## Consequences

- 应用在 Rselectron、配置与插件之间保持单一共享 `@rsbuild/core`；无双副本风险、无重复原生 binding。
- 钉住未测试 Rsbuild minor 的项目会收到一条指明已测窗口的可执行警告，而不是静默运行在未测试版本上。
- peer 范围与已测窗口是两个不同契约（安装 vs 验证）；测试与文档必须保持二者区分。
- 发布元数据新增一个冻结条目（`RSBUILD_TESTED_WINDOW` 或等价物）；release-candidate 测试与 Electron 快照一起断言其存在。

## Alternatives considered

### 把 `@rsbuild/core` 变成 exact-pin 直接依赖

否决：使用插件的应用仍需自己的副本（运行时 import + peer 解析），产生版本分叉的双份 Rsbuild/Rspack、更大的安装体积，以及 Rselectron 实例与插件栈之间的身份分裂。它以生态级单一副本保证为代价，换来 vanilla 应用摩擦与 Rselectron 内部确定性的改善。

### 把 Rsbuild 打包/vendoring 进发布产物

否决：技术上不可行——`@rspack/binding` 原生二进制与动态资源/worker 文件无法被打包器 vendoring 而不破坏解析。

### 保留 peer 但越窗硬错

否决：应用拥有自己的构建工具；硬错会阻止应用使用更新的 Rsbuild，且没有（如 Electron 那样的）目标推导需求作为理由。

### 与已测版本任何 patch 差异都警告

否决：patch 是 bugfix 语义；对每个 patch 差异都警告会制造噪声，侵蚀诊断的可信度。

### 把已测窗口放宽到整个 major

否决：窗口将与 peer 范围重合，失去验证信号。
