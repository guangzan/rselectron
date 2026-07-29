# Rselectron

Rselectron is an Rsbuild-first Electron development and build tool.

Current beta: **1.0.0-beta.0** (`npm install rselectron@1.0.0-beta.0` after publish, or install from a packed tarball).

简体中文说明见 [README.zh.md](./README.zh.md)。完整文档站点见 [`website/`](./website/)。

## CLI contract

- `rselectron --help` prints the available bootstrap options.
- `rselectron --version` prints the package version.
- `rselectron build` performs one finite production build for every configured
  Main, Preload, and Renderer Role. It accepts `--config`, `--config-loader`,
  `--mode`, and `--env-mode`; watch mode is rejected.
- `rselectron inspect` prints normalized Role, final Rsbuild, and Rspack
  configuration (`--format json|human`) without building or launching Electron.
- `rselectron preview` builds production output (unless `--skip-build`) and
  launches project-local Electron.
- `rselectron dev --watch` opts Main and Preload into rebuilds; `--watch=main`
  / `--watch=preload` select Roles explicitly and override `electron.watch`.
- `rselectron dev --renderer-only` reuses validated Main/Preload outputs.
- Changing a watched configuration dependency replaces the complete Development
  generation (Roles, Renderer server, and Electron) after one config reload.
- Running `rselectron` without an explicit option prints
  `No command specified.` and help to stderr, then exits with status 1. It does
  not launch Electron.

An omitted Role produces an `RSELECTRON_ROLE_MISSING` warning and does not
prevent configured Roles from building.

## Programmatic API

The ESM API exports `build`, `createServer`, `defineConfig`, `inspect`, `preview`,
`loadEnv`, `mergeRselectronConfig`, `mergeRsbuildConfig`,
`ELECTRON_SUPPORT_SNAPSHOT`, `resolveProjectElectron`, `RselectronError`, and
`version`.
`build()` returns per-Role stats and output paths plus an idempotent `close()`
method. `createServer()` returns Renderer URLs, the Electron child process, and
an idempotent `close()`. When Role formats or compiler targets must be derived,
Electron is resolved from the Application root against the frozen support
snapshot. Role builds load `RSELECTRON_` plus the Role-scoped prefix through
Rsbuild's environment pipeline. `rselectron/node` declares
`RSELECTRON_RENDERER_URL` plus `?asset` / `?asset&asarUnpack` /
`?modulePath` / `?nodeWorker` / `*.wasm?loader` / `*.node` module forms.
Core and CLI remain private implementation packages.

## Documentation and examples

- Bilingual docs site: `website/` (`pnpm docs:dev` / `pnpm docs:build`)
- Domain vocabulary: [`docs/monorail/CONTEXT.md`](./docs/monorail/CONTEXT.md) / [`docs/monorail/CONTEXT.zh.md`](./docs/monorail/CONTEXT.zh.md)
- Compatibility matrix: [`docs/monorail/compatibility-matrix.md`](./docs/monorail/compatibility-matrix.md)
- Learning examples: [`examples/`](./examples/) (separate from `tests/fixtures/`)
