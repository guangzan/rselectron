## Intent

梳理并重写文档站 Markdown（中英），使 Guide / Config / API 达到可发布的契约质量。访客能按页面体裁读懂 Rselectron 是什么、如何上手、如何配置与调用，以及兼容边界；Config / API 按 rspack 文档站的组织方式、按 Rselectron 体量拆页，并把 CLI 归入 API 栏。

## Decisions settled

- Effort slug：`website-docs-rewrite`（与 `website-rs-family`、`website-home-rspack` 分开跟踪；Domain pointers 链回前序）
- 范围：文档内容层 + **Config / API 信息架构拆分**；不改主页落地组件与壳层视觉
- 覆盖：全部文档页实质性重写（含已写过的 concepts / getting-started），同一质量标准
- 内容权威：实现对账 `CONTEXT.md` / ADRs / `compatibility-matrix.md`；冲突默认 **契约优先** 落文档，实现偏差记 Deferred / follow-up；本轮不改运行时
- 双语：英文为权威稿，再译简体中文；术语对齐 `CONTEXT.md` / `CONTEXT.zh.md`
- 体裁：getting-started / migration 偏任务流；configuration 系 / api 系 / compatibility / cli 偏参考；concepts 偏词汇表
- 示例：getting-started / concepts 对齐 `examples/`；Config / API / CLI 可用最小虚构片段（须能对照实现）
- 与 Rsbuild/Rspack 文档：上手必需概念给短释义 + 外链官方文档；不在本站复述通用手册
- **Config IA**（rspack 式「概览 + 主题页」，非一选项一页）：
  - `config/` 概览
  - `config/roles` — Role 形态
  - `config/electron` — Role / 应用级 electron 选项
  - `config/environment` — mode / env-mode / 前缀
- **API IA**（更贴 rspack 顶栏：CLI 在 API 下）：
  - `api/` 概览
  - `api/cli`
  - `api/javascript-api`
  - CLI 从 Guide `_meta` 移除
- **Guide**：concepts · getting-started · troubleshooting · compatibility · migration — **路径冻结**，仅页内重构；不新增 Guide 子页
- 旧 URL：**不设重定向**；只更新站内互链（接受旧外链 404）

## Deferred

- 对账中发现的实现相对契约的偏差（记 follow-up，不在本 effort 改代码行为）
- 正式 Rselectron logo / favicon / OG（仍属品牌资产后置）
- Algolia、RSS、多社交、版本文档切换、Blog 等
- Config 按单一选项继续深拆（如 `format` / `watch` 各一页）
- Guide 栏进一步拆页或 rspack 式多级目录
- 旧路径兼容重定向（若日后外链变多再开）

## Out of scope

- 主页落地组件与壳层视觉（`website-home-rspack` / 壳层已定部分）
- 变更 Rselectron 运行时、CLI 契约或兼容性矩阵结论本身（文档只陈述既有契约；矩阵变更另开 effort）
- 完整复刻 rspack Config「一选项一页」规模
- 为插件/博客等尚不存在的生态建空栏目
- 本轮设置旧 URL 重定向或过渡双挂页

## Domain pointers

- `docs/monorail/CONTEXT.md` / `CONTEXT.zh.md` — Product 边界与 Role / Development session 等术语；重写页必须一致
- `docs/monorail/compatibility-matrix.md` — Compatibility / Migration 的能力陈述权威
- `docs/monorail/adr/0008-release-quality-and-documentation-gates.md` — 完整中英文档站；examples 与 fixtures 分离
- `docs/monorail/adr/0001-capability-parity-not-drop-in-compatibility.md` — Migration 叙事前提
- `docs/monorail/adr/0006-stable-cli-and-programmatic-contracts.md` — CLI / API 契约页权威
- `docs/monorail/website-rs-family/align.md` — 前序壳层与 IA（Guide+Config+API）；本轮 partial supersede Config/API 子结构与 CLI 归属
- `docs/monorail/website-home-rspack/align.md` — 主页区块；本轮不改
- 参考组织（非权威契约）：`.repos/rspack/website` 的 `docs/*/config` 与 `docs/*/api`
