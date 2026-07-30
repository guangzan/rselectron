## Problem Statement

文档站已有 Guide / Config / API 顶栏与核心上手页，但 Config / API 仍是单页薄文档，CLI 挂在 Guide，且非核心页未按契约质量全量重写。对照 `.repos/rspack/website` 的 Config/API 组织方式，以及 ADR 0008 / compatibility matrix / 稳定 CLI·API 契约，访客难以把「怎么配、怎么调、兼容边界」当成可靠手册使用；站内仍指向即将废弃的 `/config/configuration`、`/api/api`、`/guide/cli`。

## Solution

在 slug `website-docs-rewrite` 下，以英文为权威稿、简体中文对照翻译，对全部文档页做实质性重写，并按 Rselectron 体量拆分 Config / API 信息架构（学 rspack 的「概览 + 主题页 / 分组」，不复制其一选项一页规模）：

1. **Config**：`config/` 概览 + `roles` + `electron` + `environment`；删除旧单页 `configuration`。
2. **API**：`api/` 概览 + `cli` + `javascript-api`；CLI 迁出 Guide；删除旧单页 `api/api`。
3. **Guide**：concepts / getting-started / troubleshooting / compatibility / migration 路径冻结，页内按体裁重构；从 Guide `_meta` 移除 CLI。
4. **对账**：陈述对齐 `CONTEXT.md`、ADRs、`compatibility-matrix.md`；与实现冲突时契约优先，偏差记 Deferred（不改运行时）。
5. **链接与门禁**：更新站内文档互链及主题中指向旧路径的链接（Footer / Hero 等）；不设旧 URL 重定向；扩展 `tests/docs-site.test.ts`。

## User Stories

1. As a 新用户, I want getting-started 与 concepts 用一致术语带我跑通第一次 Development session, so that 我能从 examples 对照最小配置开始。
2. As a 配置查阅者, I want Config 按 Role / electron 选项 / environment 分主题阅读, so that 我不必在单页里翻找 Rselectron 增量契约。
3. As a CLI 或程序化调用者, I want API 栏同时提供 CLI 与 JavaScript API, so that 我与 rspack 文档站顶栏习惯一致并能核对稳定导出面。
4. As a 从 electron-vite 迁移的用户, I want migration 与 compatibility 明确写出 capability parity 与 parity exceptions, so that 我不会误当成 drop-in 替换。
5. As a 中文读者, I want 与英文同等的导航与页面集合及术语对照, so that 双语站点不出现单语滞后。
6. As a 维护者, I want `docs-site` 门禁覆盖新路径、断链与示例 import, so that Config/API 拆页后构建与链接不会静默损坏。

## Implementation Decisions

- **权威与对账**：文档事实以 `docs/monorail/CONTEXT.md`（及 `CONTEXT.zh.md`）、已接受 ADRs、`compatibility-matrix.md` 为准；对照当前包导出、CLI 与 `examples/`。冲突默认按契约书写；实现偏差不写入「已支持」，记入 Deferred / follow-up。本轮不修改 Rselectron 运行时或矩阵结论。
- **双语工作流**：先完成英文页，再译简体中文；导航与页面集合中英对称；稳定术语不得自由发挥。
- **体裁**：
  - 任务流：`guide/getting-started`、`guide/migration`
  - 词汇表：`guide/concepts`
  - 参考手册：Config 各页、`api/cli`、`api/javascript-api`、`guide/compatibility`、`guide/troubleshooting`
- **示例来源**：getting-started / concepts 对齐 `examples/`（vanilla / react）；Config / API / CLI 可用最短可复制虚构片段，且 import 必须落在公开导出白名单内。Fixtures 仅可被标明为非学习用途（ADR 0008）。
- **Rsbuild/Rspack 外链**：对上手必需概念给短释义并外链官方文档；不复制通用 Rsbuild/Rspack 选项手册。
- **Config IA（中英 `_meta` 对称）**：
  - `config/index`（或栏目约定的概览入口）— `defineConfig` 总览与阅读地图
  - `config/roles` — Role 形态、缺省 Role、与 Rsbuild 配置的关系
  - `config/electron` — Role / 应用级 `electron` 选项
  - `config/environment` — `--mode` / `--env-mode` / 环境前缀
  - 移除 `config/configuration.md`
- **API IA**：
  - `api/index` — 概览（CLI vs JavaScript API）
  - `api/cli` — 自 Guide 迁入并重写
  - `api/javascript-api` — 程序化导出与生命周期
  - 移除 `api/api.md`；Guide `_meta` 不再包含 `cli`
- **Guide**：保留 `concepts`、`getting-started`、`troubleshooting`、`compatibility`、`migration` 路径；允许页内标题与小节重构；不新增 Guide 子页。
- **顶栏**：仍为 Guide + Config + API；更新各栏 `link` 指向新概览入口（若概览路径变化）。
- **旧 URL**：不设重定向或过渡双挂页。必须更新：文档互链、主题内 Footer/Hero/其它指向旧路径的链接，以及 `tests/docs-site.test.ts` 中的路径断言。不借机重做主页视觉或营销区块。
- **包边界**：改动在 `website/docs`、必要的 `_nav` / `_meta`、为修断链而改的 theme 链接字符串，以及文档门禁测试。不引入新的文档站重组件依赖。

## Testing Decisions

- **主缝（既有）**：扩展 `tests/docs-site.test.ts`。
  - 更新 `requiredRelativePages`：新 Config/API 树；断言旧 `guide/cli.md`、`config/configuration.md`、`api/api.md` **不存在**（或不再作为必选页）。
  - 保留相对/根路径链接解析与 `rselectron` import 白名单校验。
  - 更新顶栏与 `_meta` 相关断言；CLI 不再出现在 Guide 列表期望中。
  - 更新构建产物 / 主题源码中对旧路径（`/config/configuration`、`/api/api`、`/guide/cli` 等）的断言，改为新路径。
  - 对各体裁页做行为级抽检（术语、parity exceptions 关键词、CLI 命令表、公开导出提及等），避免大段金句快照。
  - 保留「Rspress documentation site builds」及与本 effort 无关的主页区块断言（除非其硬编码旧文档路径而必须改链接期望）。
- **不做**：不为文档视觉开 Playwright；不新增独立内容契约测试文件；不对每个子页做额外 HTML 全文抽检（存在性由必选清单 + 构建覆盖）。

## Out of Scope

- 主页落地视觉/区块重做（`website-home-rspack`）
- 变更运行时、CLI/API 行为或 compatibility matrix 结论
- rspack 式 Config「一选项一页」深拆
- Guide 多级目录或 compatibility/migration 再拆子页
- 旧 URL 重定向 / 过渡双挂
- Algolia、RSS、多社交、版本文档切换、Blog/Plugin 空栏目
- 正式品牌 logo 替换

## Further Notes

- 权威对齐：`docs/monorail/website-docs-rewrite/align.md`
- 前序：`website-rs-family`（壳层与初代 IA）、`website-home-rspack`（主页）；本轮 partial supersede Config/API 子结构与 CLI 归属
- 参考组织（非契约）：`.repos/rspack/website` 的 `docs/*/config` 与 `docs/*/api`
- 下一人类步骤：`/rail-slice`（同一 slug；本会话自动继续）
