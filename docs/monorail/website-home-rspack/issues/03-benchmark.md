# 03 — Benchmark（与 rspack 同数据口径）

Status: done
Blocked by: 01

## What to build

在 `HomeLayout` 中于 Why 与 Fully Featured 之间（若 02 未完成，则相对 Hero 之后、Footer 之前）接入 **Benchmark**：使用 `@rstack-dev/doc-ui` Benchmark；嵌入与 rspack 站相同的 `BENCHMARK_DATA`（Rspack / Vite / webpack 的 dev/build/hmr 秒数）；「查看详情」外链 `https://github.com/rstackjs/build-tools-performance`。标题/说明可沿用 rspack i18n。更新 `docs-site` 对中英首页的 Benchmark 可观察断言。

## Acceptance criteria

- [x] 中英首页均出现 Benchmark 区块
- [x] 页面含与嵌入数据一致的工具标签可观察标记（Rspack、Vite、webpack）
- [x] 「查看详情」（或等价文案）href 指向 `rstackjs/build-tools-performance`
- [x] 未引入 WhoIsUsing / ToolStack
- [x] `tests/docs-site.test.ts` 覆盖上述断言且构建通过
