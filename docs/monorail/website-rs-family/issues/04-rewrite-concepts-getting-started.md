# 04 — 核心页重写（concepts + getting-started）

Status: done
Blocked by: 03

## What to build

在最终 IA 下，中英同步重写 `concepts` 与 `getting-started`（并收口首页卖点与二者叙事一致）。术语对齐 `docs/monorail/CONTEXT.md`；getting-started 区分 `examples/`（学习）与 `tests/fixtures/`（回归）。非核心页本票不重写。为 `docs-site` 增加对关键术语与上手路径的行为级抽检。

## Acceptance criteria

- [x] en/zh `concepts` 覆盖 Role、Development session 等关键术语，并与 CONTEXT 一致
- [x] en/zh `getting-started` 含安装/配置/命令路径，并指向 examples；明确 fixtures 非学习示例
- [x] 重写页中指向 Config/API 的链接使用迁移后路径且不断链
- [x] `docs-site` 含对核心页的行为级抽检（非大段金句快照）
- [x] 文档站构建通过；未改动 Rselectron 运行时契约
