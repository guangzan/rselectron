# 0005. 将 Electron 视为可选的项目 peer

- Status: Accepted
- Date: 2026-07-24

## Context

Rselectron 必须使用应用所选择的 Electron 版本。代表应用安装或选择 Electron 会越过产品边界，并可能静默选择与打包所用不同的运行时。

现代 npm 版本在可解析时会安装非可选 peer 依赖。因此普通 Electron peer 会与「Rselectron 不安装 Electron」的要求冲突。其他包管理器在 peer 安装与提升行为上也不同，因此相对 Rselectron 包解析 Electron，并不能可靠替代从应用解析。

electron-vite 6.0.0-beta.1 未将 Electron 声明为 peer。其运行时相对于 electron-vite 自身创建 `require`，并通过该解析器解析 `electron` 与 `electron/package.json`。在扁平布局中这通常会到达应用的安装，但它并未明确将应用根目录确立为解析权威，在严格或隔离依赖布局下行为可能不同。

## Decision

公开的 `rselectron` 包将 Electron 声明为可选 peer 依赖。可选声明传达集成关系，而不会导致 Rselectron 安装或拥有 Electron。

`dev` 与 `preview` 必须从应用根目录解析 Electron。无法解析有效的项目本地 Electron 时，产生结构化的 `RselectronError`，标识命令、应用根目录与纠正措施。

仅当规范化后的配置仍需要由 Electron 推导的 Node 或 Chrome 目标、格式能力检查，或其他运行时版本事实时，`build` 才解析并验证项目本地 Electron。若所有这些值均已显式配置且有效，源码构建不要求安装 Electron。当需要推导且无法解析 Electron 时，`build` 以结构化错误失败，而非猜测或静默使用 Rselectron 自己的依赖图。

显式的 Electron 可执行文件覆盖会改变 `dev` 或 `preview` 启动的内容，但不提供用于目标推导的包元数据。目标推导仍需要可解析的项目本地 Electron 包，或显式目标配置。

每次 Rselectron 发布都会冻结一份 Electron 支持快照，包含该发布时间 Electron 所支持的三个稳定主版本。快照写入发布元数据、可选 peer 范围与文档；发布后不再漂移。Electron 官方发布元数据是 Node 与 Chromium 版本的来源。对每个受支持主版本，目标默认使用该主版本首次稳定发布中的 Node 与 Chromium 版本，这对同一主版本内后续兼容发布是保守的。CI 在每个受支持操作系统上，对快照中最旧与最新主版本的最新维护发布进行演练。项目本地 Electron 若不在快照内，则以结构化的不支持版本错误失败。

包清单的 `type`、所选 Electron 主版本，以及每个 Main 或 Preload Role 的 `electron.format` 共同决定模块格式。`electron.format: auto` 推导有效格式；显式的 `cjs` 或 `esm` 对照 Electron 能力与包语义进行验证。Main 与 Preload 目标推导使用支持快照元数据，而非宽松回退。

若 `electron.execPath` 未解析到属于项目本地 Electron 包的可执行文件，Rselectron 仅在所有依赖运行时的目标与 Main/Preload 格式均为显式时才启动它。自动推导被拒绝，因为包元数据与所启动运行时无法证明一致。Rselectron 从不仅为检查版本而启动任意可执行文件。

## Consequences

- npm 不会仅仅因为安装了 `rselectron` 就自动安装 Electron。
- 在 npm、pnpm、Yarn 与 Bun 布局中，应用仍是其 Electron 运行时的权威。
- 当无需推断任何 Electron 事实时，仅源码构建可在无 Electron 的情况下运行。
- 启动与目标推导不会意外使用不同的已提升 Electron 安装。
- 缺少 Electron 的错误成为稳定结构化错误表面的一部分。
- 即使 Electron 再发布新的主版本，已发布的 Rselectron 版本仍具有可复现的支持语义。
- 自定义 Electron 发行版仍可使用，但不能从不一致的安装借用无法验证的目标事实。

## Alternatives considered

### 将 Electron 声明为必需 peer

拒绝，因为 npm 可自动安装必需 peer，且带有显式目标的仅源码构建并不总是需要 Electron。

### 不声明 Electron，依赖环境中的模块解析

拒绝，因为严格依赖布局可能不会将应用的 Electron 安装暴露给 Rselectron，所选运行时会依赖布局。

### 捆绑 Electron 或将其作为直接依赖添加

拒绝，因为 Rselectron 不拥有运行时安装或运行时版本选择。

### 允许可执行文件覆盖决定目标版本

拒绝，因为可执行文件路径在不启动任意二进制的情况下无法可靠暴露包元数据，而在配置期间启动它会增加副作用与信任问题。

### 动态解析支持窗口

拒绝，因为同一 Rselectron 版本会随时间接受不同的 Electron 版本，且 CI 无法复现运行时策略。

### 接受高于最低版本的每一个 Electron 主版本

拒绝，因为未来主版本可能改变已发布 Rselectron 版本从未测试过的模块与运行时能力。
