# 02 — Surface the tested-window warning in dev, build, inspect, preview

- Status: open
- Blocked by: 01

## What to build

Wire `checkRsbuildWindow()` into every command so an out-of-window `@rsbuild/core` produces the `RSELECTRON_RSBUILD_UNTESTED` warning on the same `Diagnostic` channel the other warnings use, and the CLI prints it.

In `packages/core/src/electron/runtime.ts` (`normalizeRuntime`): push the `checkRsbuildWindow()` result (when defined) into the collected `warnings` array once per normalization — this is the single choke point already called by `dev`, `build`, `inspect`, and `preview`, so all four fire with one wiring.

- `build` and `inspect` already surface `runtime.warnings` through `BuildResult.warnings` / `InspectResult.warnings` — verify, no change expected.
- `dev` (`packages/core/src/dev.ts`): currently discards `runtime.warnings`; add `warnings: Diagnostic[]` to `CreateServerResult`, populated from the dev generation's normalized runtime, so `createServer()` returns the warning without printing.
- `preview` (`packages/core/src/preview.ts`): add `warnings: Diagnostic[]` to `PreviewResult`, populated from `preview`'s own `normalizeRuntime` call — this fires even with `--skip-build`, since preview normalizes unconditionally.
- CLI (`packages/cli/src/index.ts`): the `dev` and `preview` handlers print their result's `warnings` to stderr with the existing `[CODE] message` format, exactly like the `build` / `inspect` handlers. Programmatic consumers get the array in the result; the library itself never prints.

No behavior change for in-window versions: when `checkRsbuildWindow()` returns `undefined`, all `warnings` arrays and CLI output stay as before.

## Acceptance criteria

- [ ] `CreateServerResult` and `PreviewResult` expose `warnings: Diagnostic[]`; dev/preview populate them from their own `normalizeRuntime` call.
- [ ] CLI `dev` and `preview` print `[RSELECTRON_RSBUILD_UNTESTED]` lines to stderr when the warning is present (verified through the existing `CliIO` seam with an injected result), and print nothing new for in-window runs.
- [ ] `build` and `inspect` surfaces carry the warning with no additional plumbing (existing `runtime.warnings` path).
- [ ] Repo self-check: with the workspace's own `@rsbuild/core` (2.1.7 = `RSBUILD_TESTED_WINDOW.tested`), `pnpm test:unit`, `pnpm typecheck`, and the e2e suite pass with zero new warnings emitted.
- [ ] Programmatic dev/preview consumers receive warnings in the result object and see no library-printed output.
