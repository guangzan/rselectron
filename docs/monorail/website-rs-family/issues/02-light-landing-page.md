# 02 — 轻量落地页

Status: done
Blocked by: 01

## What to build

在已正确 `base` 的文档站上，提供轻量中英落地页：产品名、一句定位、指向 getting-started 的主 CTA、少量短卖点。卖点与产品边界须对齐 CONTEXT（Rsbuild-first；协调 Main/Preload/Renderer Roles；非 Vite 兼容层 / 非打包器 / 非脚手架）。继续使用现有默认品牌图与 `logoText`；不移植 rspack 的 Benchmark、WhoIsUsing 或重型 ToolStack。

## Acceptance criteria

- [x] en/zh 首页均呈现 Hero + 主 CTA + 短卖点
- [x] 主 CTA 通向 getting-started（在当前路径结构下可解析）
- [x] 文案不声称 Vite 兼容、安装包生成或项目脚手架
- [x] 未引入 Benchmark / 用户墙 / 重组件栈；未为落地页新增 Playwright 视觉测试
- [x] 文档站构建仍通过
