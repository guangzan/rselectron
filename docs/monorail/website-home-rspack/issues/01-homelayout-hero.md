# 01 — HomeLayout 壳、依赖与 Rselectron Hero

Status: done
Blocked by: None

## What to build

为文档站接入 `@rstack-dev/doc-ui`（及主题所需最小配套），导出自定义 `HomeLayout`：中英首页渲染 Background（可选）+ **Hero**，尚可不含 Why / Benchmark / Fully Featured / Footer。Hero 使用 doc-ui：产品名 Rselectron；中英两行文案按 spec；Get Started 进本站 getting-started（中文带 `/zh`）；GitHub stars 指向本仓库。将 `en/index.md` / `zh/index.md` 收为 `pageType: home` 元数据壳，去掉与自定义布局双轨的 frontmatter features/旧 CTA。保留既有顶栏 IA、`base`、logo/favicon。参考 `.repos/rspack/website` 的 Hero / i18n / HomeLayout 接线方式。

## Acceptance criteria

- [x] `@rselectron/website` 已引入 `@rstack-dev/doc-ui`（及构建所需最小配套），`pnpm` 过滤构建成功
- [x] 自定义 `HomeLayout` 生效；中英首页可见 Hero，产品名为 Rselectron
- [x] Hero 中文文案为「Rspack 驱动的 Electron 工具」与「基于 Rspack，快速、简单、强大，专为 Electron 打造。」；英文为「Rspack-powered Electron tooling」与「Based on Rspack. Fast, simple, and powerful—built for Electron.」
- [x] Hero CTA 指向 getting-started；中文首页 CTA href 含 `/zh/`；GitHub 指向 `guangzan/Rselectron`
- [x] 首页 frontmatter 不再提供与主题双轨的 features / 旧 hero actions
- [x] `tests/docs-site.test.ts` 覆盖上述 Hero / locale / 构建契约；既有 base 与顶栏 IA 断言仍通过
- [x] 本票不渲染 ToolStack、WhoIsUsing

## Comments

- doc-ui Hero 的 Get Started 为 onClick 导航（SSR HTML 无 CTA href）；locale 契约由主题源码 `useI18nUrl('/guide/getting-started')` + 构建产物文案断言覆盖。
