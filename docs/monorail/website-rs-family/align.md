## Intent

参考 `.repos/rspack/website`，把本仓库 `website` 打造成轻量的 Rs 家族文档站：先提升站点壳层与第一印象，再拆分顶栏信息架构，并重写核心上手叙事（中英同步），让访客能快速理解 Rselectron 是什么、如何开始用。

## Decisions settled

- 本轮同时做壳层与内容，但以壳层为先。
- 壳层对齐口径为「轻量 Rs 家族感」：品牌文案与默认图形资源、基础落地页（Hero + CTA + 短卖点）、导航/页脚、editLink、sitemap/OG；不移植 Benchmark、WhoIsUsing、Blog RSS、Algolia、多社交链、版本切换等重组件或社区规模能力。
- 顶栏信息架构为 **Guide + Config + API**：
  - Guide：concepts、getting-started、troubleshooting、compatibility、migration、cli
  - Config：configuration
  - API：api
- 内容深度为结构迁移 + 核心页重写：落地卖点、getting-started、concepts 中英同步重写；其余现有页以路径迁移与必要修正为主，不做全量升级。
- 品牌资产本轮沿用现有 Rspress 默认图 + `logoText: Rselectron`；正式独立 logo/icon 后置。
- 发布目标为 GitHub Pages 项目站：`https://guangzan.github.io/Rselectron/`，Rspress `base: '/Rselectron/'`。
- 参考源是 `.repos/rspack/website` 的体验与惯例，按 Rselectron 体量裁剪，不追求结构同构复刻。

## Deferred

- 正式 Rselectron 品牌标识（logo / favicon）
- Algolia、RSS、多社交平台、版本文档切换
- Blog / Plugin / Resources 等额外栏目
- 非核心页（configuration、cli、api、troubleshooting、compatibility、migration 等）的全量内容升级
- 超出 Pages 基本配置的部署流水线细节（若尚未存在）

## Out of scope

- 复刻 rspack 站点的重组件与社区规模营销块
- 为尚不存在的插件/博客生态建立空栏目骨架充数
- 变更 Rselectron 产品运行时、CLI 契约或兼容性矩阵结论本身（文档只陈述既有契约）

## Domain pointers

- `docs/monorail/CONTEXT.md` — Product 边界（非 Vite 兼容层 / 非打包器 / 非脚手架）；Role 与 Development session 等术语须在重写的 concepts / getting-started 中保持一致
- `docs/monorail/adr/0008-release-quality-and-documentation-gates.md` — 文档站须完整中英导航与内容；Rspress；examples 与 fixtures 分离
- 参考实现（非权威契约）：`.repos/rspack/website`
