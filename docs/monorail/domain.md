# Domain docs (rail)

All domain docs live under `docs/monorail/` with the work tracker — do not scatter to the repo root or `docs/adr/` / `docs/agents/`.

## Layout

Rselectron uses a **single-context** domain layout.

- Glossary: `docs/monorail/CONTEXT.md`
- Simplified Chinese glossary: `docs/monorail/CONTEXT.zh.md`
- ADRs: `docs/monorail/adr/`
- Acceptance record: `docs/monorail/compatibility-matrix.md` for capability parity with the frozen electron-vite baseline
- Baseline freeze notes: `docs/monorail/matrix-delta-review.md`

There is no `CONTEXT-MAP.md` and no nested context ownership. Treat the monorail context as authoritative for the whole repository.

## Consumer rules

1. Prefer glossary terms from `docs/monorail/CONTEXT.md` in specs, tickets, and code names. Read it before planning, specifying, diagnosing, testing, or changing domain behavior.
2. Respect ADRs in the area you touch. Read the ADR index in `docs/monorail/adr/` and then the ADRs relevant to the work. Accepted ADRs constrain implementation and specifications.
3. Consult `docs/monorail/compatibility-matrix.md` whenever work affects compatibility claims, supported capabilities, parity exceptions, or acceptance evidence.
4. Use the exact terms defined in `CONTEXT.md`, especially Application root, Electron entry, Role, Role configuration, Role preset, Development session, Configuration generation, and Last-known-good generation.
5. Do not infer drop-in electron-vite compatibility: Rselectron targets capability parity subject to documented exceptions.
6. Creating/updating glossary terms and ADRs is an active discipline during `/rail-align` — do not invent conflicting terms silently. If work changes domain language, update `CONTEXT.md` (and keep `CONTEXT.zh.md` current). If it changes an accepted architectural decision, add or supersede an ADR rather than silently contradicting the existing record.
