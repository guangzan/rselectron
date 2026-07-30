# 03 — 重写 API 三页含 CLI（EN→ZH）

Status: done
Blocked by: 01

## What to build

在稳定的新 API 路径上实质性重写概览、`cli`、`javascript-api`。英文权威稿完成后再译简体中文。CLI 命令/选项与程序化导出对齐 ADR 0006 与当前公开面；冲突时契约优先。为 API/CLI 相关行为增加 `docs-site` 抽检。

## Acceptance criteria

- [x] 三页中英均达到参考手册质量；概览能区分 CLI 与 JavaScript API
- [x] CLI 页覆盖显式命令与共享选项；JavaScript API 页覆盖稳定导出与主要生命周期入口
- [x] 示例 import 均在公开导出白名单内；相对链接有效
- [x] `docs-site` 含对 API/CLI 页的行为级抽检；构建通过

## Comments

- 2026-07-30: Claimed + implemented. Strengthened API overview (CLI as adapter), CLI (`RSELECTRON_BUILD_WATCH_UNSUPPORTED`, `RselectronError`, inspect layers), JS API inspect three-layer docs. Added `api pages cover CLI and JavaScript API contracts in both languages` spot-check.
