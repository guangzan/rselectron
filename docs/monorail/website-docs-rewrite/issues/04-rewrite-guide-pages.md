# 04 — 重写 Guide 五页（EN→ZH）

Status: done
Blocked by: 01

## What to build

在冻结的 Guide 路径上页内重构并实质性重写：concepts、getting-started、troubleshooting、compatibility、migration。英文权威稿完成后再译简体中文。getting-started / concepts 对齐 `examples/` 并区分 fixtures；migration / compatibility 对齐 capability parity 与 matrix 中的 parity exceptions。所有互链指向新 Config/API URL。补充或更新 Guide 行为级抽检。

## Acceptance criteria

- [x] 五页中英路径未新增子页；内容达各自体裁标准（词汇 / 任务流 / 参考）
- [x] concepts / getting-started 覆盖关键领域术语，并区分 examples 与 fixtures
- [x] migration 与 compatibility 明确非 drop-in，并文档化已知 parity exceptions（如 Vite plugins、bytecode、exported SWC helper）
- [x] 互链指向新 Config/API 路径；`docs-site` Guide 相关抽检与构建通过

## Comments

- 2026-07-30: Claimed + implemented. Restored `guide/concepts` (spec frozen path; was removed in issue 01 scaffold). Rewrote EN→ZH for concepts / getting-started / troubleshooting / compatibility / migration. Updated `requiredRelativePages`, `guide/_meta`, and added `guide pages cover concepts, parity, and learning sources…` spot-check. docs-site 12/12 green.
