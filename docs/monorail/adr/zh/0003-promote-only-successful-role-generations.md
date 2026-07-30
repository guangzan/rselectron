# 0003. 仅提升成功的 Role generation

- Status: Accepted
- Date: 2026-07-24

## Context

在监视中的开发会话期间，失败的重建不得破坏 Electron 当前正在使用的文件。当编译器或其插件已经删除或部分写入活动输出目录时，仅保留先前的内存中编译结果是不够的。

Rspack 的错误发射控制可以阻止错误编译产生的资产被写出，但它们本身并不围绕清理、插件写入或多文件输出 generation 定义事务。因此它们无法保证所需的 last-known-good 行为。

## Decision

每次监视中的 Main 与 Preload 构建都会在活动 generation 之外产生候选 generation。仅当该 Role 编译成功完成后，Rselectron 才提升候选。失败的候选被丢弃，活动的 last-known-good generation 保持不变。

候选创建为与活动 Role 输出位于同一文件系统上的唯一兄弟目录。提升使用带有活动备份的日志化重命名序列：验证候选，将活动 generation 移至备份，将候选移至活动路径，仅在成功后删除备份。任何失败步骤在有界策略内重试，然后回滚；无法完成的提升视为失败的更新。Main 提升在 Electron 子进程已停止时进行。编译器 `noEmitOnErrors` 仍保持启用，但禁止直接写入活动 generation。

初始失败行为取决于 watch 模式：

- 无 watch 时，任何初始 Role 失败都会使命令以不成功结束。
- 有 watch 时，会话会等待每个必需 Role 的首次成功 generation，然后才启动 Electron。

启动之后，成功的 Main 提升会在配置的 debounce 之后重启 Electron。成功的 Preload 提升会向连接到 Renderer Role 开发服务器的所有 renderer 页面广播完整重载。在多页 renderer 中，这是 Role 范围的广播行为，而非按窗口编排。

编译器错误发射控制作为纵深防御仍保持启用，但它们不是事务边界。

默认开发会话提供 Renderer HMR，且不监视 Main 或 Preload。`--watch` 选择加入 Role 感知的 Main 与 Preload 监视，并受每 Role 配置与重启 debounce 约束。每一次 Electron 退出，包括用户干净退出，都会结束开发或 preview 命令，并关闭所有 Role 实例与服务器。

`preview` 先构建再启动 Electron，除非提供 `--skip-build`。`build` 是有限的生产操作，永不接受 watch 模式。仅 Renderer 开发在启动前验证每个被跳过的必需 Main 或 Preload 产物已存在。

## Consequences

- 活动 generation 从不包含已知失败的编译。
- 开发构建需要暂存空间与提升/清理逻辑。
- 提升行为必须在 macOS、Linux 与 Windows 上测试，包括被 Electron 打开占用的文件。
- 未连接到开发服务器的 renderer 页面无法收到 Preload 重载广播；Rselectron 不单独建模或发现窗口。
- Main 与 Preload 提升相互独立，因此后续 Role 失败不会回滚另一 Role 已成功的 generation。
- 重命名与回滚行为必须容忍 Windows 上的杀毒软件、索引器与瞬时文件句柄；耗尽时保留 last-known-good generation 并报告结构化更新失败。
- 完整重载仅到达连接到 Renderer 开发服务器的页面。断开连接的页面仅在下一次由应用控制的导航或重建时才会收到新的 Preload generation。

## Alternatives considered

### 仅依赖 Rspack 的 no-emit-on-errors 行为

拒绝，因为它不覆盖输出清理、插件副作用，或编译器控制的资产发射之外的部分写入。

### 直接写入活动输出，并在失败时保持 Electron 进程存活

拒绝，因为「进程仍存活」并不意味着磁盘上的文件仍是连贯的 last-known-good generation。

### 每次 Preload 更新后重启 Electron

拒绝，因为约定的开发行为是 renderer 完整重载，且 Rselectron 不拥有一等窗口模型。

### 默认启用 Main 与 Preload watch

拒绝，因为进程重启与 preload 重载是破坏性副作用。它们需要显式的会话选择加入。
