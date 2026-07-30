# 04 — Footer 四栏、版权与禁用块门禁

Status: done
Blocked by: 01

## What to build

接入与 rspack 同构的 **四栏 Footer**：Guide / API / Toolchain / Community。Community **仅 GitHub**（本仓库）。Guide、API 条目挂本站现有文档（getting-started、concepts、cli、configuration、api 等），中文链带 `/zh`。Toolchain 外链 Rs 家族站点（Rsbuild、Rslib、Rspress、Rsdoctor、Rstest 等，与 rspack 同类）。页脚版权为本项目归属，**禁止** ByteDance 声明。在整页组装下保证永不渲染 ToolStack、WhoIsUsing。扩展 `docs-site`：Footer 契约、社区仅 GitHub、禁用块不出现；并与 01–03 一并构成完整落地页回归（若并行开发，本票断言以当前已合并区块为准，但禁用块与 Footer 契约必须硬性满足）。

## Acceptance criteria

- [x] 中英首页 Footer 可见四栏标题（或等价中英词条）
- [x] Community 仅 GitHub 且指向 `guangzan/Rselectron`；不出现 Discord / Twitter / BlueSky / Awesome
- [x] Guide / API 内链指向本站已有文档路径；中文页内链含 `/zh/`
- [x] Toolchain 含 Rs 家族外链；版权无 ByteDance
- [x] 中英首页不出现 WhoIsUsing / ToolStack 特征文案或区块
- [x] `tests/docs-site.test.ts` 覆盖上述契约且整站构建通过；既有 base / 顶栏 IA / 必选文档页回归仍绿
