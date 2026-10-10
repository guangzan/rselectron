# 02 — Sync domain docs, ADRs, matrix evidence, and the website troubleshooting page

Status: done
Blocked by: 01
Seams: `tests/docs/docs-site.test.ts` (website copy assertions), `tests/unit/release-candidate.test.ts` (compatibility-page window wording)
Touchpoints: `docs/monorail/CONTEXT.md`, `docs/monorail/CONTEXT.zh.md`, `docs/monorail/adr/0010-renderer-chrome-compiler-target.md`, `docs/monorail/adr/zh/0010-renderer-chrome-compiler-target.md`, `docs/monorail/adr/0011-electron-support-window.md`, `docs/monorail/adr/zh/0011-electron-support-window.md`, `docs/monorail/compatibility-matrix.md`, `website/docs/en/guide/troubleshooting.md`, `website/docs/zh/guide/troubleshooting.md`

## What to build

Bring every durable document in line with the unclamped derivation so no page still claims a `138` ceiling.

- `CONTEXT.md` / `CONTEXT.zh.md` — `Derived compiler target`: Renderer receives `output.overrideBrowserslist: ['chrome >= ${M}']` (no `K` ceiling); keep the `output.target` non-suppression note.
- `adr/0010` (en + zh) — the Renderer row becomes `chrome >= ${M}`; rewrite the "Temporary clamp and removal" section to record that the clamp was removed (upstream #48 closed, binding bump inside the 2.1.x minor line); update the Consequences line that referenced `min(M, 138)`.
- `adr/0011` (en + zh) — replace the clamp sentences in Context / Decision / Consequences with the unclamped rule (majors 28–36 were already exact; now all majors are).
- `compatibility-matrix.md` BUILD-003 / BUILD-005 evidence — replace `['chrome >= ${min(M, 138)}']` / `['chrome >= 138']` with the true-major wording.
- `website/docs/{en,zh}/guide/troubleshooting.md` — drop the clamp / browserslist-rs#48 sentence; keep the `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK` and `tools.rspack.target: 'web'` guidance.

## Acceptance criteria

- [x] No durable doc under `docs/monorail/` or `website/docs/` still describes a `138` clamp / `min(M, 138)` as current behaviour (historical effort records under `renderer-chrome-target/` may keep their dated history)
- [x] Glossary (en + zh), ADR 0010 / 0011 (en + zh), and matrix BUILD-003 / BUILD-005 state `chrome >= ${M}`
- [x] `tests/docs/docs-site.test.ts` and `tests/unit/release-candidate.test.ts` are green
- [x] `pnpm test:docs` is green

## Comments

Run 2026-10-10: start — main @ ff23a67

done — working tree (pending commit)

- seams used: `tests/docs/docs-site.test.ts`, `tests/unit/release-candidate.test.ts`
- typecheck: green
- relevant tests: green (`rstest tests/docs tests/unit/matrix-evidence.test.ts tests/unit/release-candidate.test.ts`)
- acceptance criteria: met
