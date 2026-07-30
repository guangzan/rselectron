# 0004. 发布单一 facade 包

- Status: Accepted
- Date: 2026-07-24

## Context

Rselectron 需要在核心编排、CLI 行为与公开包之间保持内部边界，但若将这些边界作为独立包发布，会在尚无用户价值之前就暴露版本协调与安装选择。

私有 workspace 包仅可作为源码边界使用，前提是公开产物是自包含的。若已发布的 facade 在运行时仍导入或通过生成类型引用私有 workspace 包名，对消费者而言就会损坏。

## Decision

workspace 包含私有的 `packages/core` 与 `packages/cli` 包，以及一个公开的 `packages/rselectron` facade。仅 npm 包 `rselectron` 被发布。

Rslib 构建公开 facade，使所有必需的私有 workspace 运行时代码与公开类型声明都包含在 `rselectron` 产物中。已发布的 JavaScript、声明、exports 与包元数据不得引用私有 workspace 包标识符。

打包验证必须在外部 fixture 中安装生成的 tarball，并在发布前同时演练公开 API 与 CLI。

Rselectron 本身仅为 ESM。仓库通过 Corepack 使用 pnpm；消费者可使用 npm、pnpm、Yarn 或 Bun。

`@rsbuild/core` 2.x 是必需 peer，Electron 是由 ADR 0005 约束的可选 peer。Rselectron 不 fork 或捆绑 Rsbuild。仓库 lockfile 与脚本仅为 pnpm，但打包产物不得依赖 pnpm workspace 解析。

## Consequences

- 消费者安装并版本化一个包。
- 内部包日后可公开抽出，而无需现在承诺该拓扑。
- 捆绑与声明生成是发布关键项，而非附带的构建细节。
- 需要 tarball 检查与隔离的消费者测试，以防止仅在 workspace 内成功。
- facade 必须保留一份由 peer 拥有的 Rsbuild 类型副本，而非捆绑不兼容的重复副本。

## Alternatives considered

### 发布 core、CLI 与 facade 包

拒绝，因为这会在尚无当前消费者需求时暴露内部拆分与跨包版本管理。

### 将所有源码放在一个包中

拒绝，因为预期的内部边界对所有权与未来抽出有用，而自包含 facade 可保留单包公开表面。
