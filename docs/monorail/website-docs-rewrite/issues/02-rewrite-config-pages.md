# 02 — 重写 Config 四页（EN→ZH）

Status: done
Blocked by: 01

## What to build

在稳定的新 Config 路径上，按参考体裁实质性重写四页：概览、`roles`、`electron`、`environment`。英文权威稿完成后再译简体中文。陈述对账 `CONTEXT.md`、相关 ADRs 与实现；上手必需的 Rsbuild 概念仅短释义 + 外链。示例可用最小虚构片段。为 Config 相关行为增加 `docs-site` 抽检（非大段金句快照）。

## Acceptance criteria

- [x] 四页中英均达到参考手册质量，术语与 glossary 一致
- [x] 覆盖 Role 形态、electron 选项、mode/env-mode/前缀等契约要点；不复述完整 Rsbuild 手册
- [x] 页内 `rselectron` import 均在公开导出白名单内；相对链接有效
- [x] `docs-site` 含对 Config 页的行为级抽检；构建通过

## Comments

- 2026-07-30: Claimed + implemented. Kept issue-01 stable slug `config/processes` (not rename to `roles`). Rewrote EN then ZH for `index` / `processes` / `electron` / `environment`. Extended `tests/docs/docs-site.test.ts` with `config pages cover contract topics in both languages`. docs-site 10/10 green.
