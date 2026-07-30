# 0008. 以跨平台证据作为发布门禁

- Status: Accepted
- Date: 2026-07-24

## Context

Rselectron 协调编译器、文件系统提升、开发服务器与 Electron 进程。单一操作系统上的单元测试无法验证进程关闭、文件替换、包管理器隔离或 Electron 运行时兼容性。同样，没有 fixture 与迁移文档的对等主张会是主观的。

## Decision

仓库标准化为：

- 通过 Corepack 使用 pnpm 进行仓库依赖管理；
- 使用 Rslib 进行包构建；
- 使用 Rstest 进行单元与集成测试；
- 使用 Playwright 的 Electron 支持进行端到端测试；
- 对静态检查与格式化使用精确、由 lockfile 固定的 Rslint 与 Prettier 版本；
- 使用 Changesets 进行版本管理、alpha/canary 发布、changelog 与 npm provenance。

GitHub Actions 是必需的发布与持续集成环境。升级 Rslint 或 Prettier 需要显式的依赖变更，并必须在合并前通过格式化、静态分析、类型检查、单元、集成及适用的端到端检查。

Rselectron 采用 MIT 许可，不包含遥测或未披露的网络上报。

文档站点使用 Rspress，并提供完整的英文与简体中文导航与内容。它包含概念、配置、CLI、编程式 API、故障排除、兼容性，以及 electron-vite 迁移材料。完整双语要求同样适用于维护中的仓库文档，包括 ADR 与 `CONTEXT.md`；任一语言都不是永久缩减的子集。在决策起草期间，英文可作为临时撰写来源，但稳定的 1.0 发布要求其简体中文等价物已存在且保持最新。

示例与测试 fixture 相互分离：

- 示例是维护中的学习产物；
- fixture 是最小的自动化验证输入，可以有意不自然。

Vanilla 与 React 应用是官方端到端验收示例。其他 UI 框架通过正常的 Rsbuild 插件兼容性获得支持，而非单独的 Rselectron 框架矩阵。

稳定的 1.0 发布要求：

- 单元与集成套件；
- Vanilla 与 React Electron 端到端套件；
- macOS、Linux 与 Windows 覆盖；
- 在 CI 硬件可用处覆盖 x64 与 arm64 主机，但不声称原生插件交叉编译；
- 该发布 Electron 支持快照中的最旧与最新主版本；
- 在 workspace 外进行打包 tarball 安装与公开 API/CLI 执行；
- 事务性重建与关闭覆盖。

Rselectron 维护对照冻结的 electron-vite 基线的等价 fixture 基准。基准记录环境与发行版，并检测实质性回归，但不承诺固定的速度倍数。

## Consequences

- 1.0 是证据门禁，而非日历标签。
- Windows 文件系统与进程行为被直接测试。
- 文档与迁移缺口可阻止稳定发布。
- 维护中文档缺失或过时的翻译可阻止稳定发布。
- 框架支持主张与 Rselectron 实际拥有的部分成比例。
- 基准变化可提示回归，而不会将单台机器的比率变成兼容性承诺。
- 工具升级是刻意、可审查的变更，而非隐式版本漂移。

## Alternatives considered

### 仅测试当前开发平台

拒绝，因为进程与文件系统行为在三个受支持操作系统间存在实质性差异。

### 将示例作为端到端 fixture

拒绝，因为教学示例与最小回归 fixture 因不同原因演进。

### 先发布英文文档，再翻译选定页面

拒绝，因为已确认的产品文档契约是完整的双语站点。

### 承诺相对 electron-vite 的固定性能倍数

拒绝，因为工具链版本、fixture 特性、缓存与硬件可能主导测得比率。
