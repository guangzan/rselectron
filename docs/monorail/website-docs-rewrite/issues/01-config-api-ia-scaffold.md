# 01 — Config/API IA 骨架与断链收口

Status: done
Blocked by: None

## What to build

落地新的 Config / API 信息架构路径与导航，使站点在内容全量重写前即可按新 URL 构建与互链：创建 Config 概览、roles、electron、environment；创建 API 概览、cli、javascript-api；从 Guide 移除 CLI；删除旧单页 `config/configuration`、`api/api`、`guide/cli`。更新文档互链与主题中指向旧路径的链接（Footer / Hero 等），不设旧 URL 重定向。扩展 `tests/docs-site.test.ts` 的必选路径、旧路径不存在断言，以及构建产物中的路径期望。本票可用最小占位正文，不要求契约级成稿。

## Acceptance criteria

- [x] 中英均存在新 Config 四页与 API 三页；旧 `configuration.md`、`api/api.md`、`guide/cli.md` 已移除
- [x] Guide / Config / API 的 `_meta` 与顶栏 `_nav` 中英对称，且 CLI 仅出现在 API 栏
- [x] 主题与文档内指向旧路径的链接已改为新路径（无站内断链）
- [x] `tests/docs-site.test.ts` 必选清单与路径相关断言已更新；`@rselectron/website` 构建通过

## Comments

- 2026-07-27: Claimed + implemented. Overview at `config/index` + `api/index`; nav `/config/` + `/api/`; Footer `/api/cli`, `/config/`, `/api/javascript-api`. `docs-site` 9/9 + full suite 99/99 green. rail-review (HEAD working tree): Standards 0 blocking; Spec 0 implementation blocking (untracked new MD/theme files are commit hygiene — not committed this session). Non-blocking: Footer still lists Configuration under API column (pre-existing IA); home-rspack WIP remains mixed in working tree.
