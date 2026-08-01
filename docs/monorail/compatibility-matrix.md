# electron-vite Compatibility Matrix / electron-vite 兼容性矩阵

This document is the acceptance record required by ADR 0001. It tracks observable capabilities rather than source-level, configuration, or plugin compatibility.

本文是 ADR 0001 要求的验收记录。它追踪可观察能力，而不是源码级、配置级或插件级兼容性。

## Baseline / 基线

- Target baseline / 目标基线: `electron-vite 6.0.0`
- Provisional source / 临时来源: `electron-vite 6.0.0-beta.1`
- Reference checkout / 参考代码: `.repos/electron-vite`
- Freeze rule / 冻结规则: perform one delta review when 6.0.0 final is published, then freeze this matrix for Rselectron 1.0.
- 冻结规则：electron-vite 6.0.0 正式版发布后执行一次差异审查，随后冻结 Rselectron 1.0 的本矩阵。

## Classification / 分类

- **Target / 目标**: required for Rselectron 1.0.
- **Replacement / 替代**: equivalent user outcome through an Rsbuild/Rspack-native mechanism.
- **Extension / 扩展**: deliberate Rselectron capability beyond the baseline.
- **Exception / 例外**: intentionally excluded from parity.
- **Out of scope / 范围外**: owned by another tool or milestone.

Implementation evidence remains **Pending / 待实现** until automated tests or published documentation prove the row.

在自动化测试或已发布文档证明对应能力前，实现证据均保持为 **Pending / 待实现**。

## Configuration and extension model / 配置与扩展模型

### CFG-001 — Three role configuration / 三角色配置

- Baseline / 基线: `main`, `preload`, and `renderer` each accept a Vite configuration.
- Contract / 契约: the same outer roles each accept a complete Rsbuild configuration plus a role-level `electron` extension.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: object, async, and function-form `defineConfig` resolve all configured roles with `{ command, mode, envMode }`.
- Evidence / 证据: `tests/config.test.ts` and `tests/build.test.ts` exercise function-form `defineConfig` with independent `{ command, mode, envMode }` and Role builds. / `tests/config.test.ts` 与 `tests/build.test.ts` 覆盖函数形式 `defineConfig` 的独立 `{ command, mode, envMode }` 与角色构建。

### CFG-002 — Configuration discovery and loading / 配置发现与加载

- Baseline / 基线: discover `electron.vite.config.*`; bundle TypeScript configuration with esbuild.
- Contract / 契约: discover only `rselectron.config.*`; delegate loading to Rsbuild 2 with `auto`, `jiti`, and `native` loader support.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: all supported extensions load, explicit `--config` wins, and unrelated Rsbuild/Vite config files are ignored.
- Evidence / 证据: `tests/config.test.ts` discovers only `rselectron.config.*`, prefers an explicit config path, and loads CJS configs through `native`, `jiti`, and `auto`. / `tests/config.test.ts` 仅发现 `rselectron.config.*`，优先显式配置路径，并通过 `native`、`jiti`、`auto` 加载 CJS 配置。

### CFG-003 — Explicit configuration composition / 显式配置组合

- Baseline / 基线: exports Vite `mergeConfig`.
- Contract / 契约: export `mergeRselectronConfig` for the outer model and `mergeRsbuildConfig` for role configurations.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: plugin arrays and function-valued Rsbuild options retain Rsbuild merge semantics.
- Evidence / 证据: `tests/config.test.ts` merges plugin arrays and function-valued `tools.rspack` via `mergeRsbuildConfig`, and outer Role/`electron` fields via `mergeRselectronConfig`. / `tests/config.test.ts` 用 `mergeRsbuildConfig` 合并插件数组与函数型 `tools.rspack`，用 `mergeRselectronConfig` 合并外层 Role/`electron` 字段。

### CFG-004 — Plugin ecosystem / 插件生态

- Baseline / 基线: accepts and exports Vite plugins.
- Contract / 契约: accepts and exports Rsbuild plugins; Rselectron owns Electron lifecycle orchestration internally.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: representative Rsbuild plugins operate independently in Main, Preload, and Renderer role instances.
- Evidence / 证据: `tests/react-dev.test.ts` runs `@rsbuild/plugin-react` on the Renderer Role instance while Main/Preload remain independent; `tests/config.test.ts` merges plugin arrays via `mergeRsbuildConfig`. / `tests/react-dev.test.ts` 在 Renderer 角色实例上运行 `@rsbuild/plugin-react`，Main/Preload 保持独立；`tests/config.test.ts` 通过 `mergeRsbuildConfig` 合并插件数组。

- Baseline / 基线: Vite plugins are the native extension mechanism.
- Contract / 契约: Vite plugins are not accepted or translated.
- Classification / 分类: Exception / 例外
- Acceptance / 验收: migration documentation states the boundary and points to Rsbuild/Rspack alternatives.
- Evidence / 证据: `website/docs/en/guide/migration.md` and `website/docs/zh/guide/migration.md` (plus compatibility pages) state Vite plugins are not accepted and must be rewritten as Rsbuild/Rspack plugins. / `website/docs/en/guide/migration.md` 与 `website/docs/zh/guide/migration.md`（及兼容性页）明确 Vite 插件不被接受，须改写为 Rsbuild/Rspack 插件。

### CFG-006 — Configuration dependency restart / 配置依赖重启

- Baseline / 基线: configuration is loaded once; changes require manual restart.
- Contract / 契约: a configuration dependency change replaces the complete orchestration generation.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: all role instances, servers, watchers, and Electron are closed before one new generation starts.
- Evidence / 证据: `tests/config-restart.test.ts` watches Rsbuild loader dependencies, replaces the full Development generation on change, ignores unrelated files, and recovers after a failed replacement without leaking the prior generation. / `tests/config-restart.test.ts` 监听 Rsbuild loader 依赖，在变更时整代替换 Development generation，忽略无关文件，并在失败替换后可恢复且不泄漏旧 generation。

## CLI and programmatic API / CLI 与编程 API

### API-001 — Commands / 命令

- Baseline / 基线: implicit development command with `serve` and `dev` aliases; explicit `build` and `preview`.
- Contract / 契约: explicit `dev`, `build`, `preview`, and `inspect` commands; no implicit command.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: omitting the command fails without launching Electron; long flags are kebab-case only.
- Evidence / 证据: `tests/tarball-smoke.test.ts`, `tests/build.test.ts`, `tests/dev.test.ts`, `tests/inspect.test.ts`, and `tests/preview.test.ts` cover the explicit command surface. / `tests/tarball-smoke.test.ts`、`tests/build.test.ts`、`tests/dev.test.ts`、`tests/inspect.test.ts` 与 `tests/preview.test.ts` 覆盖显式命令面。

### API-002 — Development watch selection / 开发监听选择

- Baseline / 基线: `--watch` opts Main and Preload into rebuild behavior.
- Contract / 契约: `--watch` selects both roles; `--watch=main`, `--watch=preload`, and `--watch=main,preload` select them explicitly.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: CLI selection overrides role-level `electron.watch`; Renderer remains managed by its dev server.
- Evidence / 证据: `tests/watch.test.ts` covers CLI Role validation, Main debounced restart, Preload rebuild without Electron restart, and CLI override of `electron.watch`. / `tests/watch.test.ts` 覆盖 CLI 角色校验、Main 防抖重启、Preload 重建且不重启 Electron，以及 CLI 覆盖 `electron.watch`。

- Baseline / 基线: build and launch production Electron output; `--skipBuild` reuses output.
- Contract / 契约: build and launch production Electron output; `--skip-build` reuses validated output.
- Classification / 分类: Target / 目标
- Acceptance / 验收: normal preview builds once, skip mode performs no build, and both return a closeable handle through the API.
- Evidence / 证据: Partial — `tests/preview.test.ts` covers build-then-launch, skip-build reuse, entry mismatch (preview fails / build warns), and arg forwarding; full debug-flag matrix remains pending. / 部分完成——`tests/preview.test.ts` 覆盖构建后启动、skip-build 复用、入口不一致（preview 失败 / build 警告）与参数转发；完整调试旗标矩阵仍待实现。

### API-004 — Programmatic operations / 编程操作

- Baseline / 基线: exports `defineConfig`, `createServer`, `build`, `preview`, `loadEnv`, and selected helpers; orchestration calls return `void`.
- Contract / 契约: export `defineConfig`, `createServer`, `build`, `preview`, `loadEnv`, `mergeRselectronConfig`, and `mergeRsbuildConfig`; orchestration returns structured closeable results.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: CLI commands are thin adapters over the same operations and all `close()` methods are idempotent.
- Evidence / 证据: Partial — `tests/build.test.ts` exercises `defineConfig`, structured per-Role `build` results, CLI delegation, and idempotent build cleanup; the remaining operations are pending. / 部分完成——`tests/build.test.ts` 覆盖 `defineConfig`、结构化逐角色 `build` 结果、CLI 委托和幂等构建清理；其余操作仍待实现。

### API-005 — Inspect / 配置检查

- Baseline / 基线: no Electron-specific inspect command.
- Contract / 契约: expose normalized Rselectron, final Rsbuild, and final Rspack configuration with secret redaction.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: human and machine output share one redacted model and do not launch or build the application.
- Evidence / 证据: `tests/inspect.test.ts` resolves three layers per Role, redacts sensitive env keys in human/json views, and maps CLI failures to `RselectronError`. / `tests/inspect.test.ts` 解析每角色三层配置，在 human/json 视图中脱敏敏感 env 键，并将 CLI 失败映射为 `RselectronError`。

### API-006 — Structured errors / 结构化错误

- Baseline / 基线: primarily reports ordinary `Error` values and formatted logs.
- Contract / 契约: operational failures use `RselectronError(code, role, cause, hint)`.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: configuration, role build, Electron resolution, launch, and unsupported-version fixtures expose stable codes.
- Evidence / 证据: Partial — `tests/build.test.ts` covers stable `RselectronError` codes and Role attribution for watch rejection and Role build failure; remaining operational failures are pending. / 部分完成——`tests/build.test.ts` 覆盖拒绝 watch 与角色构建失败的稳定 `RselectronError` 代码与角色归因；其余运行失败场景仍待实现。

### API-007 — Debugging and Electron arguments / 调试与 Electron 参数

- Baseline / 基线: supports inspector, break-on-start, remote debugging, no-sandbox, source maps, entry override, and arguments after `--`.
- Contract / 契约: preserve equivalent behavior with kebab-case CLI flags and top-level Electron options where applicable.
- Classification / 分类: Target / 目标
- Acceptance / 验收: each option reaches the expected Electron or compiler argument exactly once on all supported hosts.
- Evidence / 证据: Partial — `tests/preview.test.ts` forwards Electron `args` exactly once into the launched process; CLI `--` passthrough and the full inspector/break/remote-debug matrix remain incomplete. / 部分完成——`tests/preview.test.ts` 将 Electron `args` 恰好一次转发到启动进程；CLI `--` 透传与完整 inspector/break/remote-debug 矩阵仍不完整。

## Environment variables and types / 环境变量与类型

### ENV-001 — Environment loading / 环境变量加载

- Baseline / 基线: loads `VITE_`, `MAIN_VITE_`, `PRELOAD_VITE_`, and `RENDERER_VITE_` prefixes.
- Contract / 契约: load `RSELECTRON_`, `MAIN_RSELECTRON_`, `PRELOAD_RSELECTRON_`, and `RENDERER_RSELECTRON_` with the Rsbuild rich result model.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: each role receives only its intended public variables and `--env-mode` is independent from Rsbuild build mode.
- Evidence / 证据: `tests/config.test.ts` covers `loadEnv` cleanup metadata and Role-isolated Main/Preload defines under an independent `envMode`. / `tests/config.test.ts` 覆盖 `loadEnv` 清理元数据，以及独立 `envMode` 下 Main/Preload 的角色隔离 define。

### ENV-002 — Renderer development URL / Renderer 开发地址

- Baseline / 基线: sets and declares `ELECTRON_RENDERER_URL`.
- Contract / 契约: set only `RSELECTRON_RENDERER_URL` and declare it through `rselectron/node`.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: Main and Preload TypeScript fixtures compile without local ambient declarations and receive the listening renderer URL.
- Evidence / 证据: `tests/config.test.ts` type-checks `rselectron/node` for `RSELECTRON_RENDERER_URL`; `tests/dev.test.ts` injects the listening URL into Main at launch. / `tests/config.test.ts` 对 `rselectron/node` 的 `RSELECTRON_RENDERER_URL` 做类型检查；`tests/dev.test.ts` 在启动时将监听 URL 注入 Main。

### ENV-003 — User-code type entry / 用户代码类型入口

- Baseline / 基线: `electron-vite/node` declares query imports, native modules, WASM loaders, workers, and process env.
- Contract / 契约: `rselectron/node` declares the equivalent retained imports and Rselectron environment variables.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: a strict TypeScript fixture type-checks every retained public import form.
- Evidence / 证据: `rselectron/node` declares `RSELECTRON_RENDERER_URL`, `?asset`, `?asset&asarUnpack`, `?modulePath`, `?nodeWorker`, `*.wasm?loader`, and `*.node`. / `rselectron/node` 声明 `RSELECTRON_RENDERER_URL`、`?asset`、`?asset&asarUnpack`、`?modulePath`、`?nodeWorker`、`*.wasm?loader` 与 `*.node`。

## Role builds and outputs / 角色构建与输出

### BUILD-001 — Conventional entries and outputs / 默认入口与输出

- Baseline / 基线: discover Main and Preload under `src/<role>` and Renderer at `src/renderer/index.html`; output to `out/<role>`.
- Contract / 契约: preserve the same conventions and warn for omitted roles.
- Classification / 分类: Target / 目标
- Acceptance / 验收: zero-config Vanilla fixture resolves the documented entries and output directories.
- Evidence / 证据: Partial — ADR `docs/monorail/adr/0007-electron-role-build-contract.md` documents `src/<role>` → `out/<role>` conventions; `normalizeRuntime` injects Conventional role outputs (`out/<role>` under the Application root) when `output.distPath` is unset (`tests/unit/electron-runtime.test.ts`); getting-started / examples document and point `package.json#main` at `out/main`. Automatic zero-config discovery without `rselectron.config.*` is not implemented yet. / 部分完成——ADR `docs/monorail/adr/0007-electron-role-build-contract.md` 记录 `src/<role>` → `out/<role>` 约定；未设置 `output.distPath` 时 `normalizeRuntime` 会注入约定角色产物（应用根下的 `out/<role>`，见 `tests/unit/electron-runtime.test.ts`）；getting-started / examples 将 `package.json#main` 指到 `out/main`。尚无无 `rselectron.config.*` 的自动零配置发现。

### BUILD-002 — Independent role compilation / 独立角色编译

- Baseline / 基线: invokes separate Vite operations for Main, Preload, and Renderer.
- Contract / 契约: create one complete Rsbuild instance per configured role and run production role builds concurrently.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: per-role root, plugins, output, errors, stats, and cleanup remain isolated.
- Evidence / 证据: `tests/build.test.ts` uses a three-party barrier to prove concurrent independent Role starts, executes CJS Main and ESM Preload outputs, checks Renderer output, groups stats and paths by Role, preserves Role-specific failures, and verifies idempotent plugin cleanup. / `tests/build.test.ts` 使用三方屏障证明独立角色并发启动，执行 CJS Main 与 ESM Preload 输出，检查 Renderer 输出，按角色组织统计与路径，保留角色级失败归因，并验证插件清理幂等性。

### BUILD-003 — Electron-derived targets / Electron 推导目标

- Baseline / 基线: derives Node and Chrome targets from a hard-coded Electron major map.
- Contract / 契约: derive targets from the frozen Electron support snapshot and official release metadata; never fall back for unknown majors.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: oldest/newest supported majors resolve expected targets and unsupported majors fail structurally.
- Evidence / 证据: `tests/unit/electron-runtime.test.ts` derives Main/Preload `electron{N}-*` Rspack targets and Renderer `overrideBrowserslist: ['chrome >= ${min(M, 138)}']` (clamped browserslist-rs ceiling) from project-local majors 41/43 and rejects unsupported major 40. / `tests/unit/electron-runtime.test.ts` 从项目本地 major 41/43 推导 Main/Preload 的 `electron{N}-*` Rspack 目标与 Renderer 的 `overrideBrowserslist: ['chrome >= ${min(M, 138)}']`（browserslist-rs 上限 clamp），并拒绝不受支持的 major 40。

### BUILD-004 — Main and Preload module formats / Main 与 Preload 模块格式

- Baseline / 基线: derive CJS/ESM from Electron support and package type; reject incompatible ESM.
- Contract / 契约: preserve automatic derivation and add validated `electron.format: auto | cjs | esm`.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: package type, Electron major, and explicit override combinations produce or reject the expected format.
- Evidence / 证据: `tests/electron-runtime.test.ts` derives CJS for classic packages and ESM for `"type": "module"` packages under `electron.format: "auto"`. / `tests/electron-runtime.test.ts` 在 `electron.format: "auto"` 下为经典包推导 CJS，为 `"type": "module"` 包推导 ESM。

### BUILD-005 — Renderer target and security profile / Renderer 目标与安全模型

- Baseline / 基线: target the Electron Chromium version as a browser environment.
- Contract / 契约: officially support the equivalent web/Chromium default; allow advanced Rsbuild/Rspack target overrides with a security and compatibility diagnostic.
- Classification / 分类: Target / 目标
- Acceptance / 验收: default fixture has no Node globals; an advanced override is retained and emits the documented diagnostic.
- Evidence / 证据: `tests/unit/renderer-advanced.test.ts` keeps the default Chromium browserslist path free of `process.versions.node` and emits `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK` when `output.target: "node"` or an explicit `electron-renderer` / `electron{N}-renderer` `tools.rspack.target` is retained. `tests/unit/electron-runtime.test.ts` asserts default Renderer `overrideBrowserslist: ['chrome >= 138']` under today's snapshot clamp. / `tests/unit/renderer-advanced.test.ts` 验证默认 Chromium browserslist 路径不含 `process.versions.node`，并在保留 `output.target: "node"` 或显式 `electron-renderer` / `electron{N}-renderer` `tools.rspack.target` 时发出 `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`。`tests/unit/electron-runtime.test.ts` 断言今日快照 clamp 下默认 Renderer `overrideBrowserslist: ['chrome >= 138']`。

### BUILD-006 — External dependencies / 外置依赖

- Baseline / 基线: Electron and Node builtins are always external; application dependencies are external by default with include/exclude controls.
- Contract / 契约: preserve the behavior in Main and Preload through Rsbuild/Rspack externals.
- Classification / 分类: Target / 目标
- Acceptance / 验收: package and subpath imports obey defaults and explicit include/exclude controls in CJS and ESM output.
- Evidence / 证据: `tests/externalize.test.ts` keeps Electron, Node builtins, and dependencies external by default and honors include/exclude. / `tests/externalize.test.ts` 默认外置 Electron、Node builtins 与 dependencies，并遵守 include/exclude。

### BUILD-007 — Node-role optimization and names / Node 角色优化与命名

- Baseline / 基线: Main and Preload are not minified by default; entries are stable and non-entry chunks/assets are hashed.
- Contract / 契约: preserve these defaults while allowing safe minification overrides.
- Classification / 分类: Target / 目标
- Acceptance / 验收: package main and preload paths remain stable across builds while changed chunks receive new hashes.
- Evidence / 证据: Partial — `tests/node-defaults.test.ts` proves Main/Preload default `minify: false` and `filenameHash: false` so entry paths stay `index.cjs` without content hashes; hashed non-entry chunk naming beyond that default remains an advanced override. / 部分完成——`tests/node-defaults.test.ts` 证明 Main/Preload 默认 `minify: false` 与 `filenameHash: false`，入口保持无 content hash 的 `index.cjs`；超出该默认的非入口 chunk 哈希命名仍属高级覆盖。

### BUILD-008 — Isolated entries / 隔离入口

- Baseline / 基线: experimental isolated entries are available to Preload and Renderer.
- Contract / 契约: make Preload and Renderer `electron.isolatedEntries` stable. Preload isolation defaults dependency externalization to false when unspecified.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: every isolated entry runs without shared chunks; sandboxed Preload entries contain required third-party dependencies.
- Evidence / 证据: `tests/externalize.test.ts` covers isolated Preload; `tests/renderer-advanced.test.ts` covers isolated Renderer entries without shared chunks. / `tests/externalize.test.ts` 覆盖隔离 Preload；`tests/renderer-advanced.test.ts` 覆盖无共享 chunk 的隔离 Renderer 入口。

### BUILD-009 — Renderer multipage / Renderer 多页面

- Baseline / 基线: multipage behavior is configured through the Renderer builder input.
- Contract / 契约: use one Renderer Rsbuild configuration and its HTML/multipage facilities; do not model windows.
- Classification / 分类: Target / 目标
- Acceptance / 验收: a two-page fixture builds and serves both pages through one Renderer role.
- Evidence / 证据: `tests/multipage-dev.test.ts` serves `page-a` and `page-b` from one Renderer Role Development session. / `tests/multipage-dev.test.ts` 在同一 Renderer Role Development session 中同时服务 `page-a` 与 `page-b`。

### BUILD-010 — Resources and native assets / 资源与原生资产

- Baseline / 基线: supports `?asset`, `?asset&asarUnpack`, `?nodeWorker`, `?modulePath`, `*.wasm?loader`, and native `.node` imports.
- Contract / 契约: preserve names and runtime semantics through Rsbuild/Rspack plugins.
- Classification / 分类: Target / 目标
- Acceptance / 验收: runtime fixtures validate development, production, asar-unpacked path rewriting, Worker threads, child bundles, WASM, and host-native addons.
- Evidence / 证据: Partial — `tests/asset.test.ts` covers Main `?asset` / `?asset&asarUnpack`; `tests/worker.test.ts` covers `?modulePath` and `?nodeWorker` production paths plus `rselectron/node` declarations; `tests/native-asset.test.ts` covers Main `*.wasm?loader` and host-native `.node` loading (skips only when the host C toolchain / `node_api.h` is unavailable). Development watch participation for these forms remains pending. / 部分完成——`tests/asset.test.ts` 覆盖 Main `?asset` / `?asset&asarUnpack`；`tests/worker.test.ts` 覆盖 `?modulePath` 与 `?nodeWorker` 生产路径及 `rselectron/node` 声明；`tests/native-asset.test.ts` 覆盖 Main `*.wasm?loader` 与宿主原生 `.node` 加载（仅在缺少宿主 C 工具链 / `node_api.h` 时跳过）。这些形式的 Development watch 参与仍待实现。

### BUILD-011 — Resources directory ownership / Resources 目录职责

- Baseline / 基线: use `resources` but do not copy the complete directory into role output.
- Contract / 契约: preserve the boundary; final copying belongs to the application packager.
- Classification / 分类: Target / 目标
- Acceptance / 验收: source builds do not duplicate the directory and imported assets still resolve correctly.
- Evidence / 证据: `tests/asset.test.ts` imports one resources file while leaving an unused sibling uncopied into Role output. / `tests/asset.test.ts` 导入单个 resources 文件，未使用的同级文件不会被复制进 Role 输出。

### BUILD-012 — Decorator metadata / 装饰器元数据

- Baseline / 基线: exports an optional `swcPlugin`.
- Contract / 契约: use native Rsbuild/Rspack SWC configuration and do not export the helper.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: a decorator-metadata fixture compiles and runs without an additional Rselectron plugin.
- Evidence / 证据: Partial — migration/compatibility docs state the SWC helper is not exported and native Rsbuild/Rspack SWC must be used; a dedicated decorator-metadata fixture remains pending. / 部分完成——迁移/兼容性文档说明不导出 SWC helper、须使用 Rsbuild/Rspack 原生 SWC；专用装饰器元数据 fixture 仍待实现。

### BUILD-013 — V8 bytecode / V8 字节码

- Baseline / 基线: optionally compiles production Main/Preload CJS output to V8 bytecode.
- Contract / 契约: do not implement bytecode compilation.
- Classification / 分类: Exception / 例外
- Acceptance / 验收: compatibility and migration documentation identify the exception without suggesting silent fallback.
- Evidence / 证据: `website/docs/en/guide/migration.md`, `website/docs/zh/guide/migration.md`, and compatibility pages identify bytecode as unimplemented with no silent fallback. / `website/docs/en/guide/migration.md`、`website/docs/zh/guide/migration.md` 与兼容性页将字节码标为不实现且无静默回退。

## Development lifecycle / 开发生命周期

### DEV-001 — Startup barrier / 启动屏障

- Baseline / 基线: build Main and Preload, start Renderer server, then launch Electron.
- Contract / 契约: initialize roles concurrently but launch Electron only after every required initial role succeeds and Renderer is listening.
- Classification / 分类: Target / 目标
- Acceptance / 验收: Electron never starts against missing initial output or an unavailable Renderer URL.
- Evidence / 证据: `tests/dev.test.ts` launches Electron only after Main/Preload build and Renderer listen, and records the injected `RSELECTRON_RENDERER_URL`. / `tests/dev.test.ts` 仅在 Main/Preload 构建与 Renderer listen 之后启动 Electron，并记录注入的 `RSELECTRON_RENDERER_URL`。

### DEV-002 — Renderer HMR / Renderer 热更新

- Baseline / 基线: Renderer uses Vite HMR.
- Contract / 契约: Renderer uses Rsbuild HMR.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: Vanilla and React fixtures update without restarting Electron.
- Evidence / 证据: Partial — `tests/dev.test.ts` and `tests/react-dev.test.ts` prove Vanilla/React Renderer HMR without Electron restart via `createServer`; Playwright Electron UI observation remains pending. / 部分完成——`tests/dev.test.ts` 与 `tests/react-dev.test.ts` 在 `createServer` 上证明 Vanilla/React Renderer HMR 且不重启 Electron；Playwright Electron UI 观测仍待实现。

### DEV-003 — Main updates / Main 更新

- Baseline / 基线: opt-in Main watch rebuilds and restarts Electron.
- Contract / 契约: preserve opt-in behavior with role selection and restart debounce.
- Classification / 分类: Target / 目标
- Acceptance / 验收: one successful generation causes one debounced restart; failed generations cause none.
- Evidence / 证据: `tests/watch.test.ts` covers one successful Main rebuild causing a debounced Electron restart. / `tests/watch.test.ts` 覆盖一次成功的 Main 重建触发防抖 Electron 重启。

### DEV-004 — Preload updates / Preload 更新

- Baseline / 基线: opt-in Preload watch rebuilds and broadcasts Renderer full reload.
- Contract / 契约: preserve role-wide broadcast to all pages connected to the Renderer dev server.
- Classification / 分类: Target / 目标
- Acceptance / 验收: connected multipage fixtures reload after successful promotion; disconnected pages are not claimed as controlled.
- Evidence / 证据: Partial — `tests/watch.test.ts` proves Preload rebuild without Electron restart; connected multipage full-reload broadcast remains covered by `sockWrite('full-reload')` wiring without a multipage fixture. / 部分完成——`tests/watch.test.ts` 证明 Preload 重建且不重启 Electron；已接入 `sockWrite('full-reload')`，多页面连接广播仍缺专用 fixture。

### DEV-005 — Build error recovery / 构建错误恢复

- Baseline / 基线: reports build errors; recovery behavior is not a strong public contract.
- Contract / 契约: without watch, close and fail; with watch, wait for every required role's first successful generation.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: both branches release or retain resources exactly as documented.
- Evidence / 证据: `tests/build.test.ts` rejects `build({ watch: true })` with `RSELECTRON_BUILD_WATCH_UNSUPPORTED`; `packages/core/src/dev.ts` `waitForFirstSuccess` fails closed without watch and waits for the first successful generation when watch is enabled, preserving LKG on later failures (`tests/watch.test.ts`). / `tests/build.test.ts` 以 `RSELECTRON_BUILD_WATCH_UNSUPPORTED` 拒绝 `build({ watch: true })`；`packages/core/src/dev.ts` 的 `waitForFirstSuccess` 在无 watch 时失败关闭，在有 watch 时等待首次成功 generation，随后失败保留 LKG（`tests/watch.test.ts`）。

### DEV-006 — Last-known-good generations / 最后成功版本

- Baseline / 基线: a failed rebuild does not trigger restart/reload, but output writes are not transactionally specified.
- Contract / 契约: build candidates outside the active output and promote only complete successful generations with rollback.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: compiler errors, plugin writes, interrupted rename, and Windows file contention never replace the active generation with a known failed one.
- Evidence / 证据: Partial — `tests/generation.test.ts` covers journaled promote, validation failure, and EBUSY retry/rollback; `tests/watch.test.ts` preserves active Main output after a failed watched rebuild; `.github/workflows/ci.yml` retains fixture/rstest artifacts on failure across platforms. Direct plugin-write fixtures and interrupted-promotion recovery remain pending. / 部分完成——`tests/generation.test.ts` 覆盖 journal 晋升、校验失败与 EBUSY 重试/回滚；`tests/watch.test.ts` 在失败的 watched Main 重建后保留活跃输出；`.github/workflows/ci.yml` 在跨平台失败时保留 fixture/rstest 产物。直写插件 fixture 与中断晋升恢复仍待实现。

### DEV-007 — Renderer-only development / 仅 Renderer 开发

- Baseline / 基线: skips Main and Preload builds and reuses previous output.
- Contract / 契约: preserve the mode but validate every required skipped artifact before launch.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: valid output launches; missing or mismatched output fails before Electron starts.
- Evidence / 证据: `tests/renderer-only.test.ts` reuses Node outputs, rejects missing Main artifacts, and keeps Renderer HMR. / `tests/renderer-only.test.ts` 复用 Node 产物、拒绝缺失的 Main 产物，并保持 Renderer HMR。

### DEV-008 — Electron exit ends the session / Electron 退出结束会话

- Baseline / 基线: any Electron child close ends the CLI process.
- Contract / 契约: any Electron exit ends dev or preview and closes role resources.
- Classification / 分类: Target / 目标
- Acceptance / 验收: clean exit and crash fixtures both terminate without leaked servers, watchers, or children.
- Evidence / 证据: `tests/dev.test.ts` kills Electron and verifies the Renderer server stops serving. / `tests/dev.test.ts` 杀死 Electron 后验证 Renderer 服务器停止服务。

## Electron resolution and support / Electron 解析与支持

### ELECTRON-001 — Project-local runtime / 项目本地运行时

- Baseline / 基线: resolves Electron through electron-vite's module resolver without declaring a peer.
- Contract / 契约: declare Electron as an optional peer and resolve it from the application root.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: npm, pnpm, Yarn, and Bun layout fixtures select the application runtime or fail structurally.
- Evidence / 证据: `tests/electron-runtime.test.ts` resolves a fake Application-root Electron install and fails with `RSELECTRON_ELECTRON_NOT_FOUND` when derivation is required; `tests/package-managers.test.ts` installs the packed facade under npm, pnpm, Yarn, and Bun and proves the same Application-root resolution or missing-peer error in each layout. / `tests/electron-runtime.test.ts` 从 Application root 解析伪造 Electron，并在需要推导时以 `RSELECTRON_ELECTRON_NOT_FOUND` 失败；`tests/package-managers.test.ts` 在 npm、pnpm、Yarn、Bun 下安装打包 facade，并证明各布局下同样的 Application-root 解析或 missing-peer 错误。

### ELECTRON-002 — Support snapshot / 支持快照

- Baseline / 基线: hard-coded Electron major mappings with permissive unknown-version fallback.
- Contract / 契约: freeze the three stable majors supported at each Rselectron release; reject versions outside the snapshot.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: release metadata, optional peer range, documentation, and CI use the same immutable snapshot.
- Evidence / 证据: `ELECTRON_SUPPORT_SNAPSHOT` and the public peer range freeze majors 41–43; `.github/workflows/ci.yml` runs the suite against majors 41 and 43 on every supported OS/arch combination where runners are available. / `ELECTRON_SUPPORT_SNAPSHOT` 与公开 peer range 冻结 major 41–43；`.github/workflows/ci.yml` 在可用 runner 的每个受支持 OS/arch 组合上对 major 41 与 43 跑套件。

### ELECTRON-003 — Launch entry / 启动入口

- Baseline / 基线: use `package.json#main` with CLI/environment override and validate file existence at launch.
- Contract / 契约: keep the manifest as authority, allow config/CLI override, and detect planned-output mismatch before dev/preview launch; build warns.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: stale, missing, overridden, and packaging-rewritten manifest fixtures follow the documented error/warning behavior.
- Evidence / 证据: `tests/preview.test.ts` warns on `build` and fails `preview`/`dev` launch with `RSELECTRON_ELECTRON_ENTRY_MISMATCH` when `package.json#main` disagrees with the planned Main output; missing Main artifacts are rejected by `tests/renderer-only.test.ts` before Electron starts. / `tests/preview.test.ts` 在 `package.json#main` 与计划 Main 产物不一致时对 `build` 告警并对 `preview`/`dev` 以 `RSELECTRON_ELECTRON_ENTRY_MISMATCH` 失败；`tests/renderer-only.test.ts` 在启动 Electron 前拒绝缺失的 Main 产物。

## Product and release boundaries / 产品与发布边界

### SCOPE-001 — Application packaging / 应用打包

- Baseline / 基线: source build only; external packagers create installers and distributables.
- Contract / 契约: compose with electron-builder and Electron Forge rather than embedding packaging.
- Classification / 分类: Out of scope / 范围外
- Acceptance / 验收: documentation describes output consumption without claiming installer generation.
- Evidence / 证据: `website/docs/en/guide/compatibility.md` and `website/docs/zh/guide/compatibility.md` describe source-build outputs consumed by external packagers without installer generation. / `website/docs/en/guide/compatibility.md` 与 `website/docs/zh/guide/compatibility.md` 说明源码构建产物由外部打包工具消费，不生成安装包。

### SCOPE-002 — Project scaffolding / 项目脚手架

- Baseline / 基线: scaffolding is supplied by separate projects.
- Contract / 契约: defer `create-rselectron` to a separate post-core milestone.
- Classification / 分类: Out of scope / 范围外
- Acceptance / 验收: the 1.0 package contains no hidden template or generator contract.
- Evidence / 证据: Partial — docs and examples state scaffolding is out of scope / deferred; packed facade surface checks remain covered by package-manager and tarball tests without a generator entry. / 部分完成——文档与示例声明脚手架超出范围/延期；打包 facade 面由包管理器与 tarball 测试覆盖且无生成器入口。

### RELEASE-001 — Framework acceptance / 框架验收

- Baseline / 基线: framework support follows Vite plugins and external templates.
- Contract / 契约: core remains framework-neutral; Vanilla and React receive official E2E acceptance, others follow Rsbuild plugin compatibility.
- Classification / 分类: Replacement / 替代
- Acceptance / 验收: Vanilla and React pass the full supported-host suite without framework-specific core branches.
- Evidence / 证据: Partial — `tests/dev.test.ts` covers Vanilla HMR; `tests/react-dev.test.ts` covers React HMR via `@rsbuild/plugin-react` without core React branches. Remaining supported-host matrix coverage is pending. / 部分完成——`tests/dev.test.ts` 覆盖 Vanilla HMR；`tests/react-dev.test.ts` 通过 `@rsbuild/plugin-react` 覆盖 React HMR 且无 core React 分支。其余受支持宿主矩阵覆盖仍待实现。

### RELEASE-002 — Cross-platform release evidence / 跨平台发布证据

- Baseline / 基线: the reference repository does not contain an equivalent automated test matrix.
- Contract / 契约: gate 1.0 on macOS, Linux, Windows, supported host architectures where available, and oldest/newest supported Electron majors.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: GitHub Actions records unit, integration, E2E, packed-tarball, transactional rebuild, and shutdown evidence.
- Evidence / 证据: `.github/workflows/ci.yml` runs format/Rslint/typecheck/build (docs+bench on main push only), Rstest (including packed-tarball, generation, config-restart, HMR/shutdown coverage), and Playwright Electron smoke. PR uses a single ubuntu/Electron 43 cell; main push uses ubuntu×43, ubuntu×41, windows×43, and macos-latest (arm64)×43. Failure uploads retain rstest/playwright/fixture artifacts. Exact Prettier/`@rslint/core` pins and the slim matrix are asserted by `tests/unit/ci-workflow.test.ts`. / `.github/workflows/ci.yml` 运行 format/Rslint/typecheck/build（docs+bench 仅 main push）、Rstest（含 packed-tarball、generation、config-restart、HMR/shutdown）与 Playwright Electron 冒烟。PR 为单格 ubuntu/Electron 43；main push 为 ubuntu×43、ubuntu×41、windows×43、macos-latest (arm64)×43。失败时上传 rstest/playwright/fixture 产物。`tests/unit/ci-workflow.test.ts` 断言精确的 Prettier/`@rslint/core` 钉扎与精简矩阵。

### RELEASE-003 — Performance evidence / 性能证据

- Baseline / 基线: no repository benchmark contract.
- Contract / 契约: benchmark equivalent fixtures against the frozen electron-vite baseline without promising a fixed multiplier.
- Classification / 分类: Extension / 扩展
- Acceptance / 验收: cold build, rebuild, dev-ready time, and peak memory reports record toolchain versions and host conditions.
- Evidence / 证据: `scripts/benchmarks/run.mjs` measures equivalent Vanilla fixtures for cold build, rebuild, development-ready time, and peak RSS with host/cache/fixture/Electron/Node/toolchain metadata; `scripts/benchmarks/check.mjs` + `tests/benchmark-report.test.ts` fail material regressions via a ratio threshold (not a fixed marketing multiplier). Provisional electron-vite comparison targets `6.0.0-beta.1` until final GA (`docs/monorail/matrix-delta-review.md`). / `scripts/benchmarks/run.mjs` 对等价 Vanilla fixture 测量冷构建、重建、开发就绪时间与峰值 RSS，并记录主机/缓存/fixture/Electron/Node/工具链元数据；`scripts/benchmarks/check.mjs` 与 `tests/benchmark-report.test.ts` 以比率阈值（非固定营销倍率）判定实质性回退。在正式 GA 前，electron-vite 对比暂以 `6.0.0-beta.1` 为准（`docs/monorail/matrix-delta-review.md`）。

### RELEASE-004 — Published package boundary / 发布包边界

- Baseline / 基线: electron-vite publishes one package.
- Contract / 契约: publish one self-contained ESM-only `rselectron` facade while keeping core and CLI workspace packages private.
- Classification / 分类: Target / 目标
- Acceptance / 验收: an external packed-tarball fixture runs CLI and API without private workspace runtime or declaration references.
- Evidence / 证据: `tests/tarball-smoke.test.ts` and `tests/package-managers.test.ts` pack the public facade, install it outside the workspace under npm/pnpm/Yarn/Bun (skipping only when a host tool is unavailable), invoke CLI and ESM API, assert bin/exports/license/`rselectron/node` surface, reject leaked private references, and exercise idempotent `close()`. / `tests/tarball-smoke.test.ts` 与 `tests/package-managers.test.ts` 会打包公共 facade，在 workspace 外用 npm/pnpm/Yarn/Bun 安装（仅在宿主缺少该工具时跳过），调用 CLI 与 ESM API，断言 bin/exports/license/`rselectron/node` 面，检查私有引用未泄漏，并验证幂等 `close()`。

## Matrix maintenance / 矩阵维护

1. Every implementation pull request updates affected evidence fields.
2. 每个实现 PR 都必须更新受影响条目的证据字段。
3. A capability may move from Target to Exception only through an accepted ADR.
4. 能力从“目标”变为“例外”必须通过已接受的 ADR。
5. The final electron-vite 6.0.0 delta review may add rows but must not silently rewrite accepted Rselectron decisions. See `docs/monorail/matrix-delta-review.md` for the provisional `6.0.0-beta.1` freeze.
6. electron-vite 6.0.0 正式版差异审查可以新增条目，但不得静默改写已接受的 Rselectron 决策。临时冻结说明见 `docs/monorail/matrix-delta-review.md`（目前对照 `6.0.0-beta.1`）。
7. Stable 1.0 requires evidence for every Target, Replacement, and Extension row, and published documentation for every Exception or Out-of-scope row.
8. 稳定版 1.0 要求所有“目标”“替代”“扩展”条目具备证据，并要求所有“例外”“范围外”条目具备已发布说明。
9. `tests/matrix-evidence.test.ts` guards against bare `Pending` evidence on Target/Replacement/Extension rows and requires DEV-004/DEV-005 headings.
10. `tests/matrix-evidence.test.ts` 阻止 Target/Replacement/Extension 行出现裸 `Pending` 证据，并要求存在 DEV-004/DEV-005 标题。
