## Problem Statement

Rselectron 的文档站（`website`）目前是极简 Rspress：单栏 Guide、默认首页、缺少 Pages 发布所需的 `base` / 站点元数据，也缺少可对外展示的轻量落地体验。对照 `.repos/rspack/website`，差距主要在站点壳层与信息架构，而非立刻需要 rspack 同级的栏目与营销组件。访客难以在第一眼建立「Rs 家族文档站」的预期，也难以从清晰的 Guide / Config / API 分区找到配置与 API 材料。

## Solution

在保持 Rspress、完整中英双语（ADR 0008）的前提下，按 align 口径升级文档站：

1. **壳层（优先）**：轻量落地页（Hero + 主 CTA + 短卖点）、导航/页脚、GitHub editLink、sitemap 与 Open Graph；`base` 固定为 GitHub Pages 项目站路径；品牌暂用现有默认图 + `logoText`。
2. **信息架构**：顶栏拆为 Guide + Config + API，并迁移现有页面路径与交叉链接。
3. **核心内容**：中英同步重写落地卖点、concepts、getting-started；其余页只做迁移与断链/术语修正。
4. **门禁**：更新现有文档站测试，使路径清单、链接校验与站点构建仍通过。

不复刻 rspack 的 Benchmark / WhoIsUsing / Blog / Algolia / 多社交 / 版本切换；不新增虚构 Plugin/Blog/Resources 栏目；不改动 Rselectron 运行时或兼容性矩阵结论。

## User Stories

1. As a 潜在用户, I want 打开文档首页就能看到清晰的产品一句话与上手 CTA, so that 我能立刻判断这是否解决我的 Electron + Rsbuild 需求并开始阅读。
2. As a 迁移或查阅用户, I want 顶栏按 Guide / Config / API 分区, so that 我不必在单一 Guide 长列表里找配置与 API。
3. As a 英文或中文读者, I want concepts 与 getting-started 用一致的领域术语讲清 Roles 与开发会话, so that 我能按文档跑通第一次 Development session。
4. As a 贡献者, I want 文档页提供指向仓库的 editLink, so that 我能快速提出内容修正。
5. As a 维护者, I want 文档站以 GitHub Pages 项目站 `base` 构建且门禁测试覆盖新路径, so that 发布到 `https://guangzan.github.io/Rselectron/` 时资源与内链不会静默损坏。

## Implementation Decisions

- **参考与裁剪**：以 `.repos/rspack/website` 为体验参考，只采纳轻量壳层惯例（落地结构、editLink、sitemap/OG、顶栏分区习惯）；禁止为对齐而引入其重组件栈或社区规模插件集。
- **发布与 base**：站点 URL 为 `https://guangzan.github.io/Rselectron/`；Rspress `base` 为 `/Rselectron/`。sitemap / OG 的绝对 URL 与该发布根一致。本轮不要求完整自定义部署流水线，但构建产物必须在该 `base` 下可正确解析静态资源。
- **品牌**：继续使用现有 Rspress 默认 logo/icon 资源与 `logoText: 'Rselectron'`；不阻塞于正式品牌资产。
- **落地页**：提供轻量自定义首页（或等价 Home 布局），包含产品名、一句定位、指向 getting-started 的主 CTA、少量短卖点（须与 CONTEXT 一致：Rsbuild-first、协调 Main/Preload/Renderer Roles、非 Vite 兼容层 / 非打包器 / 非脚手架）。不做 Benchmark、用户墙、生态 ToolStack 大图区块。
- **壳层站点配置**：在网站配置中启用 editLink（指向本仓库 `website/docs`）、sitemap、Open Graph；社交链保持 GitHub 即可。不启用 Algolia、RSS、多平台社交、公告条、版本下拉。
- **顶栏 IA（中英对称）**：
  - **Guide**：concepts、getting-started、troubleshooting、compatibility、migration、cli
  - **Config**：configuration
  - **API**：api
- **路径迁移**：将 `configuration` 与 `api` 移出单一 `guide/` 树到与顶栏对应的栏目路径；`cli` 留在 Guide。迁移后更新 `_nav`、栏目 `_meta`、站内相对/绝对链接，以及任何仍指向旧路径的仓库引用。旧 URL 无义务永久 redirect（站点尚未对外依赖旧链）；若实现成本低可加客户端 redirect，非必须。
- **核心内容重写**：en/zh 同步重写首页卖点文案、`concepts`、`getting-started`。术语必须对齐 `docs/monorail/CONTEXT.md`（Application root、Role、Development session、Configuration generation、Last-known-good generation、Project-local Electron、parity exceptions 等）。getting-started 继续区分 `examples/`（学习）与 `tests/fixtures/`（回归），与 ADR 0008 一致。
- **非核心页**：configuration、cli、api、troubleshooting、compatibility、migration 以搬迁与链接/术语修正为主，不做本轮叙事重写。
- **双语契约**：en 与 zh 保持同等导航与页面集合；核心重写页不得出现单语长期滞后。
- **包与主题边界**：改动限制在文档站包（Rspress 配置、theme/首页、docs 内容与导航）。不改 `rselectron` 运行时包行为。可增加实现轻量壳所必需的最小依赖（例如 sitemap/OG 插件）；避免引入 Tailwind/Sass/doc-ui 全家桶，除非无更轻替代且仍满足「轻量」口径。

## Testing Decisions

- **主测试缝（既有，最高优先）**：扩展 `tests/docs-site.test.ts`。
  - 更新必选页面相对路径清单，覆盖 Guide / Config / API 新布局（中英均存在）。
  - 保留相对链接解析与 `rselectron` 示例 import 白名单校验。
  - 保留「Rspress documentation site builds」；构建须在配置了 `/Rselectron/` base 的前提下成功并产出 `doc_build`。
  - 增加对站点发布契约的轻量断言：配置（或构建可读产物）体现 `base` 为 `/Rselectron/`，以及顶栏所需的栏目入口页存在。
  - 对核心重写页做**行为级**抽检即可（例如 concepts 同时覆盖 Role / Development session 等关键术语；getting-started 仍含 install/dev 路径与 examples 指引），避免大段金句快照。
- **次缝**：`tests/release-candidate.test.ts` 中若硬编码 `guide/compatibility` 等仍有效路径则保持；若本轮移动了被引用文件则同步更新。compatibility 本轮留在 Guide，预期无需因 IA 迁移而改路径。
- **不做**：不为落地页视觉或主题像素开 Playwright；不新增对 Algolia/RSS 等明确延期能力的测试。

## Out of Scope

- 正式品牌 logo/favicon 设计与替换
- Algolia、RSS、多社交、版本文档切换、公告系统
- Blog / Plugin / Resources 栏目（含空壳占位）
- 非核心文档页的全量重写
- 复刻 rspack Landing 重组件（Benchmark、WhoIsUsing、完整 ToolStack 等）
- 变更 Rselectron 产品运行时、CLI/API 契约或 compatibility matrix 结论
- 完整 GitHub Pages 部署流水线的产品化（若仓库尚无；本轮以正确 `base` 与可构建产物为准）

## Further Notes

- 权威对齐记录：`docs/monorail/website-rs-family/align.md`
- 领域与门禁：`docs/monorail/CONTEXT.md`、`docs/monorail/adr/0008-release-quality-and-documentation-gates.md`
- 参考实现（非契约）：`.repos/rspack/website`
- 下一人类步骤：`/rail-slice`（同一 slug）
