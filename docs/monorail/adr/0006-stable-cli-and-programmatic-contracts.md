# 0006. Define explicit CLI and programmatic contracts

- Status: Accepted
- Date: 2026-07-24

## Context

Rselectron is both a command-line tool and a library used by higher-level tooling. Implicit commands, CLI-only behavior, or unstructured failures would make automation ambiguous and force integrations to parse logs.

electron-vite 6.0.0-beta.1 treats its root command as development, aliases it as both `serve` and `dev`, uses camel-case long options, and returns `void` from its orchestration APIs. Rselectron intentionally needs a stricter, lifecycle-aware contract.

## Decision

The CLI requires one explicit subcommand:

- `dev` starts a development session.
- `build` performs a finite production source build.
- `preview` builds unless `--skip-build` is present, then launches Electron.
- `inspect` resolves configuration without launching Electron or producing application outputs.

Long options use kebab-case only. There are no hidden camel-case aliases and no implicit default command. `build` does not support watch mode.

`--mode` selects Rsbuild build mode and `--env-mode` independently selects environment files. `dev --watch` enables both Main and Preload watching; `dev --watch=main`, `dev --watch=preload`, and `dev --watch=main,preload` select roles explicitly and override role-level `electron.watch` for the session. Renderer watching remains implicit in its development server and is not a value accepted by this option. `dev --renderer-only` reuses validated Node-role outputs, `preview --skip-build` reuses production outputs, and `--config-loader` selects the Rsbuild-supported config loader. These flags project the configuration and lifecycle contracts in ADRs 0002 and 0003 rather than defining alternate behavior.

The public programmatic API is:

- `defineConfig`
- `createServer`
- `build`
- `preview`
- `loadEnv`
- `mergeRselectronConfig`
- `mergeRsbuildConfig`

`createServer` returns a lifecycle handle containing `urls`, `electronProcess`, and an idempotent `close`. `build` returns per-role `stats`, output `paths`, and an idempotent `close` for resources retained by plugins or compilers. `preview` returns `buildResult`, `electronProcess`, and an idempotent `close`.

CLI commands are adapters over the same programmatic operations and normalization pipeline; they do not maintain a second behavior implementation.

`inspect` exposes three layers for every configured role:

1. normalized Rselectron configuration;
2. final Rsbuild configuration after presets and merges;
3. final Rspack configuration.

Inspect output redacts values originating from environment variables whose names or values are classified as sensitive. Human-readable and machine-readable output use the same redacted data model.

All operational failures use `RselectronError(code, role, cause, hint)`. Codes are stable machine identifiers, `role` identifies Main, Preload, Renderer, Electron, or orchestration scope, `cause` preserves the original failure, and `hint` provides an actionable correction. CLI exit codes and messages are projections of this error rather than separate error types.

## Consequences

- Scripts can distinguish commands and failures without parsing prose.
- Integrators can own session shutdown and inspect child-process state.
- CLI and library behavior remain aligned.
- Inspect output becomes a compatibility and support surface, so secret-redaction fixtures are mandatory.
- Adding aliases or changing handle fields requires normal public-API compatibility review.

## Alternatives considered

### Keep an implicit development command

Rejected because a missing subcommand can accidentally launch Electron in automation.

### Offer camel-case aliases for compatibility

Rejected because Rselectron does not claim CLI drop-in compatibility and duplicate spellings become permanent surface area.

### Return `void` and rely on process-global shutdown

Rejected because embedded tools need URLs, child-process access, build results, and deterministic cleanup.

### Expose only normalized Rselectron config from inspect

Rejected because plugin and preset problems often appear only in final Rsbuild or Rspack configuration.
