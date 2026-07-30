## Intent

把文档站主页做成与 `.repos/rspack/website` 同构的落地体验（组件、区块节奏、Benchmark、Footer 形态），同时保留 Rselectron 作为站壳品牌与上手入口；明确裁掉 Rstack 营销块与「谁在使用」，社区入口只留 GitHub。

## Decisions settled

- 主页区块顺序与 rspack 对齐：Hero → Why → Benchmark → Fully Featured → Footer；**不包含** ToolStack（Rstack）、**不包含** WhoIsUsing。
- 实现依赖 `@rstack-dev/doc-ui`，按块组装，参考 `.repos/rspack/website` 主题实现。
- Benchmark：使用与 rspack 相同的嵌入数据与数据来源口径（`rstackjs/build-tools-performance`），含「查看详情」外链到该仓库。
- Hero：产品名为 Rselectron；Get Started / GitHub stars 指向本仓库与本站 getting-started；两行文案定为：
  - ZH：`Rspack 驱动的 Electron 工具` / `基于 Rspack，快速、简单、强大，专为 Electron 打造。`
  - EN：`Rspack-powered Electron tooling` / `Based on Rspack. Fast, simple, and powerful—built for Electron.`
- Why + Fully Featured：文案、能力点、视觉资源按 rspack **原封不动**复用；链接策略为本站有相关页面才可跳转，没有则不跳（不外链 rspack.rs，不保留会 404 的站内路径）。
- Footer：与 rspack 同构四栏（Guide / API / Toolchain / Community）；Community **仅 GitHub**（本仓库）；Guide、API 条目挂本站现有文档；Toolchain 保持 Rs 家族外链。
- 工作目录 slug：`website-home-rspack`（与已完成的 `website-rs-family` 分开跟踪）。
- 品牌静态资源可继续暂用已接入的 rspack logo / favicon，直至自有标识就绪。

## Deferred

- 正式 Rselectron logo / favicon / OG 图
- Why / Fully Featured 卡片与本站文档的逐条映射表（spec/实现时按「有相关页才挂链」落地；多数卡片初期可不跳）
- 页脚版权文案微调（不复用 ByteDance 声明）
- Algolia、RSS、多社交、版本文档切换、Blog 等

## Out of scope

- 主页 ToolStack（Rstack）与 WhoIsUsing
- Community 中 Discord / Twitter / BlueSky / Awesome 等非 GitHub 入口
- 变更 Rselectron 运行时、CLI 契约或兼容性矩阵结论
- 把 Why / Fully Featured 改写成 Rselectron 域内叙事（本轮明确不改）

## Domain pointers

- `docs/monorail/CONTEXT.md` — Product 仍为 Rsbuild-first Electron 工具；本轮 Hero 对外口号强调 Rspack，与 glossary 的 Rsbuild-first 并存为营销口径，不在本轮改写 glossary
- `docs/monorail/website-rs-family/align.md` — 前序「轻量壳层、不移植 Benchmark」已被本轮主页决策 partial supersede；壳层 base / IA / 核心文档页仍以该 effort 为准
- 参考实现（非权威契约）：`.repos/rspack/website`
