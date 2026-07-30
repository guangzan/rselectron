# 01 — Pages base 与站点元数据壳

Status: done
Blocked by: None

## What to build

为文档站配置 GitHub Pages 项目站发布根：`base` 为 `/Rselectron/`，站点绝对 URL 为 `https://guangzan.github.io/Rselectron/`。启用指向本仓库 `website/docs` 的 editLink，以及与该发布根一致的 sitemap 与 Open Graph；保留 GitHub 社交链。本票不改顶栏 IA、不重做落地页视觉。

## Acceptance criteria

- [x] Rspress `base` 为 `/Rselectron/`
- [x] editLink 指向 `https://github.com/guangzan/Rselectron` 下的 `website/docs`
- [x] sitemap / Open Graph 使用发布根 `https://guangzan.github.io/Rselectron/`
- [x] 社交链仍含 GitHub；未引入 Algolia、RSS、多社交或版本切换
- [x] `tests/docs-site.test.ts` 断言 base（或等价构建契约）且 `@rselectron/website` 构建成功产出 `doc_build`
