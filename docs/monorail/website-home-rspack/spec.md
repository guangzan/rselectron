## Problem Statement

文档站主页仍是轻量 frontmatter 首页（短卖点卡片），与访客对「Rs 家族 / rspack 系站点」的第一印象预期不符。对照 `.repos/rspack/website`，缺少同构的 Hero / Why / Benchmark / Fully Featured / 多栏 Footer 节奏；同时若整页镜像 Rspack 又会丢掉 Rselectron 的上手入口与本仓库社区链。需要在「主页体验对齐 rspack」与「站壳仍是 Rselectron」之间落地一版可发布的首页。

## Solution

用 `@rstack-dev/doc-ui` 按 rspack 主题方式组装自定义落地页，区块为 **Hero → Why → Benchmark → Fully Featured → Footer**；明确省略 ToolStack（Rstack）与 WhoIsUsing。Hero 与 Footer 社区归属本仓库；Why / Fully Featured 文案原封不动复用 rspack；Benchmark 使用与 rspack 相同的嵌入性能数据；中英双语可切换且 CTA / 页脚文档链保持 locale 正确。既有 Guide / Config / API 文档 IA 与 Pages `base` 不变。

## User Stories

1. As a 首次访客, I want 打开首页就看到与 rspack 站同构的大区块落地页, so that 我对站点专业度与家族归属有明确预期。
2. As a 首次访客, I want Hero 明确写出 Rselectron 产品名, so that 我不会误以为自己打开了 Rspack 官网镜像。
3. As a 中文访客, I want Hero 副标题为「Rspack 驱动的 Electron 工具」且说明为「基于 Rspack，快速、简单、强大，专为 Electron 打造。」, so that 一句话能建立品类印象。
4. As an English visitor, I want Hero copy「Rspack-powered Electron tooling」and「Based on Rspack. Fast, simple, and powerful—built for Electron.」, so that the bilingual landing stays parallel.
5. As a 潜在用户, I want Hero 主按钮进入本站 getting-started（含中文 locale 前缀）, so that 我能立刻开始按文档上手，而不是留在营销页。
6. As a 潜在用户, I want Hero 的 GitHub / stars 指向 `guangzan/Rselectron`, so that 我能正确 star 与提 issue。
7. As a 对照过 rspack 站的访客, I want 看到 Why 四格卖点且文案与 rspack 一致, so that 视觉与叙事节奏符合预期。
8. As a 对照过 rspack 站的访客, I want 看到 Fully Featured 能力网格且文案与 rspack 一致, so that 「功能完备」区块不显得缩水。
9. As a 访客, I want Why / Fully Featured 卡片在本站没有相关文档时点击无跳转, so that 我不会掉进 404。
10. As a 访客, I want 当本站确有相关文档时卡片可跳到该页, so that 有映射的能力点仍能进文档。
11. As a 关注构建性能的访客, I want 看到与 rspack 相同数据口径的 Benchmark 图, so that 对比数字可核对同一来源。
12. As a 关注构建性能的访客, I want Benchmark「查看详情」链到 `rstackjs/build-tools-performance`, so that 我能审计原始基准仓库。
13. As a 访客, I want 主页不出现 ToolStack / Rstack 工具墙, so that 页面不推销与本产品无关的家族矩阵块。
14. As a 访客, I want 主页不出现 WhoIsUsing / 用户墙, so that 未积累用户案例时不出现空洞社交证明。
15. As a 访客, I want Footer 仍为四栏（Guide / API / Toolchain / Community）, so that 页脚信息架构与 rspack 一致。
16. As a 访客, I want Footer Community 只出现 GitHub 且指向本仓库, so that 社区入口单一且正确。
17. As a 文档读者, I want Footer Guide / API 条目指向本站现有文档路径, so that 页脚不会链到不存在的 rspack 路径。
18. As a 生态访客, I want Footer Toolchain 仍外链 Rsbuild / Rslib / Rspress / Rsdoctor / Rstest 等, so that 家族工具可达且不占用 Community。
19. As a 中文用户, I want 切换到中文后主页各区块文案与页脚标题为中文, so that 落地体验双语完整。
20. As a 中文用户, I want 从中文主页点 Hero CTA 或 Footer 文档链仍停留在 `/zh/...`, so that 不会被送回英文文档。
21. As a 英文用户, I want 默认语言主页与文档链不带多余 `/en` 前缀（与站点默认 lang 一致）, so that URL 习惯与现网一致。
22. As a 维护者, I want 顶栏 Guide / Config / API 与既有文档树不被本轮主页改动打断, so that `website-rs-family` 已交付的 IA 继续有效。
23. As a 维护者, I want 站点 `base` 仍为 `/Rselectron/`, so that GitHub Pages 项目站资源路径不回归。
24. As a 维护者, I want 可继续暂用 rspack logo/favicon 静态资源, so that 主页改版不阻塞于自有品牌设计。
25. As a 贡献者, I want 主页实现集中在 website 主题与依赖, so that 不误伤 `rselectron` 运行时包。
26. As a AFK agent, I want 构建产物上可断言主页区块存在、禁用块不存在、Hero/Footer 契约成立, so that 无需人工点像素即可验收。
27. As a 发布负责人, I want `pnpm` 过滤构建 `@rselectron/website` 仍成功, so that Pages 产物可继续产出。
28. As a 双语维护者, I want en/zh 主页入口仍存在且可渲染同一套自定义 Home 布局, so that ADR 0008 的双语站要求不被破坏。
29. As a 访客, I want 页脚版权不出现 ByteDance 声明, so that 法律归属不误指向他方。
30. As a 文档作者, I want 旧 frontmatter 短卖点首页被自定义落地页替换, so that 不会出现两套首页叙事叠床架屋。

## Implementation Decisions

- **范围**：仅文档站包（Rspress 配置、theme 落地页、必要依赖、首页 frontmatter 收口）；不改运行时、CLI、兼容性矩阵。
- **参考实现**：以 `.repos/rspack/website` 的 `HomeLayout` / `Landingpage` / `HomeFooter` / `theme/i18n` 为组装蓝本；按 align 裁剪区块。
- **依赖**：引入 `@rstack-dev/doc-ui`（及主题实现所需的最小配套，如样式预处理若 doc-ui 强依赖）；版本与 rspack 站可对齐的近期稳定线，避免无故锁死未发布 API。
- **布局导出**：主题提供自定义 `HomeLayout`（或等价），渲染顺序固定为 Background（若沿用）→ Hero → Why → Benchmark → Fully Featured → HomeFooter → 简短版权条；禁止渲染 ToolStack、WhoIsUsing。
- **Hero**：使用 doc-ui Hero；`title` 为 Rselectron；`subTitle` / `description` 用上表中英文案；`showStars` + GitHub URL 为本仓库；Get Started 导航到本站 getting-started，且经 locale 感知 URL 辅助（延续既有 `useI18nUrl` 思路）。
- **Why / Fully Featured**：文案、图标、Lottie/SVG 资源从 rspack 站对应块原样迁入；不改写为 Rselectron 域叙事。链接：仅当本站存在相关文档页时设置可导航 href；否则渲染为不可跳转（无死链、无强制外链 rspack.rs）。
- **Benchmark**：复用 doc-ui Benchmark；嵌入与 rspack 相同的 `BENCHMARK_DATA` 数值与工具标签；详情链到 `https://github.com/rstackjs/build-tools-performance`。区块标题/说明可沿用 rspack i18n 词条。
- **Footer**：四栏 Guide / API / Toolchain / Community。Community 仅一项 GitHub → 本仓库。Guide、API 条目映射本站现有 IA（getting-started、concepts、cli、configuration、api 等已有页）。Toolchain 外链 Rs 家族站点（与 rspack 同类列表）。版权条使用本项目归属文案，禁止 ByteDance 版权句。
- **首页内容源**：`en/index.md` 与 `zh/index.md` 收为 `pageType: home`（可保留 title/description 元数据）；卖点与 CTA 改由主题落地页承担，避免 frontmatter Hero/features 与自定义布局双轨。
- **语言**：扩展主题 i18n，覆盖落地页与 Footer 所需中英词条；默认 lang `en`，中文路径 `/zh`。
- **与前序 effort 关系**：`website-rs-family` 的 base、顶栏 IA、核心文档页、editLink/sitemap/OG 保持有效；本轮 partial supersede 的仅是「轻量首页、禁止 Benchmark」等主页相关约束。
- **品牌资产**：可继续使用 `docs/public` 下已配置的 rspack navbar logo / favicon；正式换标延期。

## Testing Decisions

- **主测试缝（既有，唯一优先缝）**：扩展 `tests/docs-site.test.ts`。只断言对外可观察行为：构建成功、`doc_build` 中英首页 HTML 含约定区块/文案/链接契约，以及禁用块与禁用社区入口不出现。不测组件内部 state、不测像素。
- **建议断言类别**：
  - 构建：`@rselectron/website` build 成功。
  - 结构：中英 `index.html` 出现 Hero 产品名 Rselectron、Why / Benchmark / Fully Featured / Footer 特征文案或结构标记；不出现 WhoIsUsing / ToolStack 特征文案（或约定 CSS/文案探针）。
  - Hero：中英副标题/说明金句存在；CTA href 含 getting-started，中文页含 `/zh/`；GitHub 指向本仓库。
  - Benchmark：详情外链指向 `build-tools-performance`；页面含与嵌入数据一致的工具标签（如 Rspack / Vite / webpack）之一组可观察标记。
  - Footer：Community 可见 GitHub；不可见 Discord / Twitter / BlueSky / Awesome；Guide/API 内链指向本站已有文档路径且中文带 locale。
  - 回归：既有 base、顶栏 IA、必选文档页、链接校验、品牌静态资源文件存在等断言保持或按需微调。
- **Prior art**：同文件已有「构建 + 读 `doc_build` HTML / 配置源」模式（含中文 Hero CTA locale 前缀断言）；沿用该模式，不新开 Playwright 视觉缝。
- **不做**：主题单元测试、doc-ui 快照、真实网络拉取 benchmark 仓库。

## Out of Scope

- ToolStack（Rstack）与 WhoIsUsing
- Community 非 GitHub 入口
- 将 Why / Fully Featured 改写成 Rselectron 域内文案
- 正式自有 logo / favicon / OG 图设计
- Algolia、RSS、多社交、版本文档切换、Blog/Plugin/Resources 栏目
- 变更 Rselectron 运行时、CLI/API 契约或 compatibility matrix
- 为缺失文档补齐 rspack 同名指南页（本轮以「无页不跳」处理）

## Further Notes

- Align 来源：`docs/monorail/website-home-rspack/align.md`。
- Hero 口号强调 Rspack，与 `CONTEXT.md` 的 Rsbuild-first 产品定义并存为营销口径；本轮不改 glossary。
- 接缝已确认：仅扩展 `tests/docs-site.test.ts`（构建产物行为断言），不新增测试缝。
- 轨内交付物为本 monorail `spec.md`；按 `docs/monorail/issue-tracker.md`，rail 工程规格不默认开 GitHub Issue。下一步可用 `/to-issues` 或等价流程拆实现票。
