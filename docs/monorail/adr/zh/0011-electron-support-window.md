# 0011. Electron 支持窗口：下沿固定 28，上沿随发布滚动

- Status: Accepted
- Date: 2026-08-07
- Amends: [0005-electron-is-an-optional-project-peer.md](../0005-electron-is-an-optional-project-peer.md)

## Context

ADR 0005 将每个 Rselectron 发布版本冻结为发布时 Electron **支持的三个稳定 major**，附带逐 major 元数据（Node、Chromium、ESM 能力）、对最老与最新 major 的 CI 覆盖，以及快照外版本的结构化硬错误。快照当时记录 major 41–43。

electron-vite 基线（6.0.0-beta.1）宽松得多：不声明 Electron peer、不拒绝任何版本、为 major 22–41 维护逐 major Node/Chromium 表，表外 major 静默回退到表中最老条目（`node16.17` / `chrome108`）。其能力判断是阈值式（`ESM >= 28`、`import.meta` paths `>= 30`）。因此固定在较老 Electron major 的项目在 electron-vite 下可用，却被 Rselectron 硬拒绝。

用户希望 Rselectron 能服务于固定在较老但仍支持 ESM 的 Electron major 的应用。**向下**扩窗是安全的：ESM 时代（28+）的每个 major 都已支持 ESM Main/Preload 输出，其 Chromium major 均不高于 browserslist-rs 上限（138），历史发布元数据稳定且只需一次性录入。**向上**扩窗无需设计变更——快照上沿本来就随每次发布滚动。

旧的「三个稳定 major」表述混淆了两件不同的事：**窗口下沿**（可以是固定的、文档化的常量）与**窗口上沿**（必须随 Electron 发布节奏滚动）。将二者拆分后，下沿成为产品决策而非发布时机的巧合。

## Decision

每个 Rselectron 发布版本冻结一个 **Electron 支持窗口**，取代「三个稳定 major」：

- **下沿**：固定为 Electron **28**（首个支持 ESM 的 major；28 以下仍以 `RSELECTRON_ELECTRON_UNSUPPORTED` 硬拒绝）。
- **上沿**：发布时最新的三个稳定 major（今日为 43），即窗口随每次发布向上滚动。
- 窗口随发布冻结：发布元数据、可选 peer 范围（今日为 `>=28 <44`）、文档与 CI 使用同一不可变窗口；发布后不漂移。
- 窗口内每个 major 在 `ELECTRON_SUPPORT_SNAPSHOT` 中携带逐 major 元数据（该 major 首稳定版的 Node 与 Chromium、`esm` 能力、首稳定版字符串）。无静默回退、无阈值猜测：窗口外的 project-local Electron 仍以结构化不支持版本错误失败。
- CI 在每个可用 runner 的受支持 OS/arch 组合上运行**下沿 major**（28.x）与**上沿 major** 的最新维护版。今日即 main 分支矩阵运行 Electron 28.x（取代 41.0.0）与 43.2.0。
- Renderer Chromium 推导不变：`chrome >= min(M, 138)`，沿用 browserslist-rs clamp。对低于 clamp 的 major（28–36），这给出精确的快照 Chromium major——这是对老 major 的行为改进，而非新机制。

本 ADR 修订 ADR 0005 的快照段落：「三个稳定 major」约定及其「接受所有高于最低线的 major」否决项被重新界定。Rselectron 仍然拒绝没有冻结逐 major 元数据与 CI 端点验证的 major；下沿 28 的窗口不是未经验证的 best-effort 范围。「动态解析支持窗口」仍然被否决。

## Consequences

- Electron 28–43 的应用被接受；28 以下仍以结构化不支持版本错误失败。
- `ELECTRON_SUPPORT_SNAPSHOT` 从 3 条增至 16 条（新增 28–40）；历史元数据是一次性、稳定的数据。
- 公开可选 peer 范围变为 `>=28 <44`。
- main 分支 CI 在 Electron 28.x 上真实运行 e2e 套件，实际锻炼旧运行时；旧 Electron 在最新 CI runner 上有一定兼容风险（已接受）。
- 推导出的 Renderer browserslist 对 28–36 变为精确值（`chrome >= M`），不再一律 `chrome >= 138`。
- 对老 major 发出 `electron${N}-main` / `electron${N}-preload` 目标；Rspack 是否接受 ~37 以下 major 的目标字符串需在实现中验证（预期遵循 webpack target 语法）。

## Alternatives considered

### 维持三个稳定 major 约定

否决：固定在较老 major 的项目仍被硬拒绝，而基线接受它们；下沿本是发布时机的巧合，而非产品决策。

### 效仿 electron-vite：无窗口，未知 major 静默回退

否决：ADR 0005 的冻结元数据模型正是为了避免未经测试、无法验证的目标事实；对未知 major 静默回退会重新引入该风险（对新 major 尤其错误，基线的回退即为明证）。

### 下沿低于 28

否决：28 以下为前 ESM 时代（仅 CJS），引入第二套能力体制而实际收益有限；用户选择了 ESM 时代下沿。

### 对窗口外 major 用警告层级取代硬错误

否决：窗口外 major 没有可推导目标的冻结元数据；警告层级要么静默猜测，要么要求目标管线且无验证面。
