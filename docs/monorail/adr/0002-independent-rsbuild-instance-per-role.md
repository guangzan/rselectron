# 0002. Use one independent Rsbuild instance per role

- Status: Accepted
- Date: 2026-07-24

## Context

An Electron application has Main, Preload, and Renderer source-build roles. They need different entries, targets, formats, externalization rules, output directories, and development behavior.

Rsbuild environment configuration is not equivalent to three complete Rsbuild configurations: instance-level concerns such as root and server configuration cannot vary freely per environment. Treating the roles as environments of one compiler would therefore make the promise of a complete per-role configuration false.

Rselectron also owns Electron-specific options at both application and role scope. A role-level field named `electron` extends, but is not part of, the Rsbuild configuration passed to Rsbuild.

## Decision

Rselectron creates one independent Rsbuild instance for each configured role. Production role builds may run concurrently; a single multi-compiler is not the core orchestration model.

The public configuration has outer `main`, `preload`, and `renderer` role keys. Each role value accepts the full Rsbuild configuration surface plus a Rselectron-owned `electron` extension. Before creating an Rsbuild instance, Rselectron separates the role's `electron` extension from the Rsbuild configuration. This keeps instance options such as `root` independent per role and prevents the custom field from leaking into Rsbuild.

“Accepts the full Rsbuild configuration” describes the configuration surface, not a promise to invoke every Rsbuild operation for every role. Server options affect a role only when Rselectron starts a development server for that role; the standard lifecycle starts one for Renderer, while Main and Preload use build/watch.

Application-wide launch and discovery options live under the top-level `electron` key, including `packageJson`, launch `entry`, `execPath`, process `args`, and `restartDebounce`. Role-level `electron` contains source-build and update behavior such as `externalizeDeps`, `isolatedEntries`, `watch`, and `format`. There is no implicit `shared` block. Users compose common configuration explicitly with the exported merge helpers.

The Rselectron config module is loaded once per orchestration generation. A watched config dependency change closes all role instances and the Electron process, reloads the module once, recreates every configured role, and starts a new development session only after required initial builds and the renderer server are ready.

Only `rselectron.config.{ts,js,mts,mjs,cts,cjs}` is discovered by default. An explicit config path may select another filename. Loading delegates to the Rsbuild 2 config loader with `auto` as the default and exposes the same `auto`, `jiti`, and `native` choices through `--config-loader`. Rselectron supplies its own config filename list so Rsbuild config files are not discovered accidentally.

A config function receives `{ command, mode, envMode }`:

- `command` is `dev`, `build`, `preview`, or `inspect`.
- `mode` preserves Rsbuild's `development`, `production`, or `none` semantics.
- `envMode` selects environment files independently from build mode.

The two merge APIs have deliberately different domains:

- `mergeRselectronConfig` composes the outer role and Electron-aware configuration.
- `mergeRsbuildConfig` is the Rsbuild merge operation for role configurations and preserves Rsbuild's function/plugin merge behavior.

Environment loading follows Rsbuild's rich result model rather than returning a flattened record. Default public prefixes are `RSELECTRON_`, `MAIN_RSELECTRON_`, `PRELOAD_RSELECTRON_`, and `RENDERER_RSELECTRON_`; only `RSELECTRON_RENDERER_URL` is reserved for the development renderer URL. The `rselectron/node` type entry declares this variable on `ProcessEnv` so Main and Preload code can consume it without application-owned ambient declarations.

## Consequences

- Each role can use the complete Rsbuild configuration and its own root; operation-specific options only affect operations used by that role.
- The same property name, `electron`, has deliberately different scope at the top level and inside a role.
- Type definitions must make the extension explicit, and normalization must remove it before invoking Rsbuild.
- Config restart is coordinated across all roles; partial hot replacement of configuration is not supported.
- Memory and startup cost may be higher than with one compiler, while orchestration and failure isolation are clearer.
- Main and Preload `server` settings are accepted as part of the complete Rsbuild surface but have no runtime effect in the standard build/watch lifecycle; normalization emits a role-aware diagnostic instead of silently implying a server exists.
- Config dependencies reported by Rsbuild's loader define the controlled full-restart watch set.
- Build mode and environment-file selection cannot accidentally overwrite each other.

## Alternatives considered

### Model roles as Rsbuild environments in one instance

Rejected because environment-level configuration cannot express the promised per-role instance settings.

### Add an implicit shared configuration block

Rejected because merge order and array/plugin semantics would become a second configuration-composition system. Explicit merge helpers make composition visible.

### Nest Rsbuild under `role.rsbuild`

Rejected because it adds ceremony and moves away from the familiar outer role shape. The normalization boundary is sufficient, provided it is typed and tested.

### Discover `rsbuild.config.*` or `electron.vite.config.*`

Rejected because multiple implicit configuration authorities would make startup and restart behavior ambiguous.

### Use one generic merge helper

Rejected because outer Rselectron semantics and inner Rsbuild plugin/function semantics are different contracts.
