# 02 — Why + Fully Featured（rspack 原文与条件链接）

Status: done
Blocked by: 01

## What to build

在已有 `HomeLayout` 上接入 **Why** 与 **Fully Featured** 两块：文案、能力点、图标/Lottie 等资源按 `.repos/rspack/website` **原封不动**迁入；不改写成 Rselectron 域叙事。卡片链接策略：本站有相关文档页才可跳转，否则不可导航（无 404、不强制外链 rspack.rs）。区块插入顺序为 Hero 之后、Benchmark/Footer 之前（若后者尚未合并，先占位在 Hero 后即可）。扩展主题 i18n 覆盖这两块所需中英词条。更新 `docs-site` 对中英首页的结构/文案探针与「无死链」约定。

## Acceptance criteria

- [x] 中英首页均出现 Why 四格与 Fully Featured 能力网格，特征文案与 rspack 原文一致（或可识别的 i18n 对应句）
- [x] 未改写为 Rselectron Role / Development session 叙事
- [x] 无对应本站文档的卡片不可跳到不存在路径；有映射的卡片（若有）跳到本站有效页
- [x] 仍不渲染 ToolStack、WhoIsUsing
- [x] `tests/docs-site.test.ts` 断言中英首页含 Why / Fully Featured 可观察标记，且构建通过
