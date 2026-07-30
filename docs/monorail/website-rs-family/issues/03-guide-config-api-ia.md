# 03 — Guide / Config / API 信息架构迁移

Status: done
Blocked by: 01

## What to build

将顶栏拆为 Guide + Config + API（中英对称）：`configuration` 归 Config，`api` 归 API，`cli` 与 concepts / getting-started / troubleshooting / compatibility / migration 留在 Guide。迁移页面路径，更新 `_nav`、栏目 `_meta` 与站内链接；扩展 `docs-site` 必选路径清单与链接校验。旧 URL redirect 非必须。

## Acceptance criteria

- [x] en/zh 顶栏均为 Guide、Config、API 三栏
- [x] 页面归属符合 spec：Guide 含 cli；Config 含 configuration；API 含 api
- [x] 站内相对/绝对文档链接无断链（`docs-site` 链接校验通过）
- [x] `tests/docs-site.test.ts` 必选路径清单已对齐新布局；构建通过
- [x] `release-candidate` 等仍引用 `guide/compatibility` 的路径若未移动则保持有效
