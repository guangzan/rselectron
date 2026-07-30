# 0007. Establish the Electron role build contract

- Status: Accepted
- Date: 2026-07-24

## Context

A complete Rsbuild configuration is intentionally flexible, but Electron roles still require predictable entries, output paths, runtime targets, module formats, and externalization. Without a role contract, configurations can build successfully while producing files Electron cannot launch or preload safely.

electron-vite 6.0.0-beta.1 provides useful behavioral references: conventional `src/main`, `src/preload`, and `src/renderer` inputs; role-specific `out` directories; Electron and Node builtin externalization; stable Node entry filenames; renderer multipage support through the underlying web builder; and query-based asset, worker, module-path, WebAssembly, and native-module handling.

## Decision

### Role discovery and outputs

Default inputs are:

- Main: `src/main/index.{js,ts,mjs,cjs}`
- Preload: `src/preload/index.{js,ts,mjs,cjs}`
- Renderer: `src/renderer/index.html`

Default outputs are `out/main`, `out/preload`, and `out/renderer`. A missing role emits a warning and skips that role unless the warning is explicitly ignored. Renderer multipage input is configured through the single Renderer Rsbuild configuration; Rselectron does not create a window configuration layer.

The Main and Preload entry filenames are stable (unhashed and referenceable) because `package.json#main`, preload paths, worker paths, and packager configuration may refer to them. Stability does not freeze the extension to `.js`; the default extension follows the [ESM-native Main/Preload output contract](./0009-esm-native-main-preload-output.md). Their non-entry chunks and assets use content hashes. Renderer output follows normal Rsbuild web naming and hashing.

### Application manifest and launch entry

The application root selects the default application manifest; `electron.packageJson` may select another manifest. For `dev` and `preview`, the manifest's `main` field is the authoritative Electron entry unless CLI or config supplies an explicit entry override.

Rselectron normalizes the expected Main output and compares it with the launch entry. A mismatch is a structured startup error in `dev` and `preview`, because launching stale or unrelated code is unsafe. `build` reports the mismatch as a warning because source output may intentionally be consumed by a later packaging step that rewrites the manifest.

### Presets, targets, and formats

Main and Preload presets default to the project-local Electron's Node target, do not minify, and derive `cjs` or `esm` from Electron capability, package type, and the role-level `electron.format`. Renderer uses the corresponding Chromium target and normal web optimization.

Users may override role presets, but Rselectron hard-validates role identity:

- Main and Preload must have an entry, a compatible Node target, a valid module format, and mandatory Electron/Node externals.
- Renderer must have an HTML or explicitly configured entry. Its supported default is the Electron-compatible web/Chromium target. Advanced target overrides remain available through Rsbuild/Rspack, but non-web targets emit a security and compatibility diagnostic because they commonly imply `nodeIntegration` or Electron globals in Renderer code.
- Entry filenames needed by the application manifest or preload references must remain stable.

### Externalization and isolated entries

`electron`, Electron subpaths, Node builtins, and `node:` builtins are always external in Main and Preload. Application `dependencies` are external by default, with explicit include and exclude controls.

Preload and Renderer `electron.isolatedEntries` are stable features. They produce independently executable entries without shared chunks. When enabled for Preload and `externalizeDeps` is not explicit, dependency externalization defaults to `false` so sandboxed preload entries are self-contained. An explicit conflicting Preload setting is retained but emits a diagnostic. Renderer isolation does not change dependency externalization.

### Electron resource imports

Rselectron preserves the following public import forms:

- `?asset`
- `?asset&asarUnpack`
- `?nodeWorker`
- `?modulePath`
- `*.wasm?loader`
- native `.node` modules

Their declarations are exported from `rselectron/node`. The application `resources` directory is the default resource location, but a source build does not copy the whole directory automatically; packaging tools own final resource layout.

Decorator metadata uses Rsbuild/Rspack's native SWC configuration. Rselectron does not export a separate SWC helper. Only Rsbuild plugins are accepted.

### Renderer-only development

Renderer-only development skips Main and Preload compilation only after validating that all required Main and Preload outputs already exist and match the normalized launch/preload paths. It never silently starts against missing artifacts.

## Consequences

- Conventional projects need little configuration while custom Rsbuild projects retain the full role surface.
- Hard validation prevents successful but non-runnable Electron outputs.
- Stable entry names coexist with cacheable chunks and assets.
- Native modules can be referenced, but Rselectron does not cross-compile or package them.
- Query forms and `rselectron/node` are long-term public API.
- Role-aware diagnostics distinguish harmless unused settings from invalid Electron output.
- Advanced Renderer target overrides are outside the default security profile and carry an explicit diagnostic rather than being silently rejected.

## Alternatives considered

### Make every preset value freely overridable

Rejected because invalid target, format, entry, or builtin bundling can create output that fails only after Electron launches.

### Copy the entire resources directory during source builds

Rejected because source compilation does not know the final packager layout and would duplicate packaging behavior.

### Model each renderer page or window as a role

Rejected because Rsbuild already supports multipage web output and Electron window lifecycle belongs to the application.

### Make isolated Preload or Renderer entries experimental

Rejected because independently executable Preload and Renderer entries are part of the frozen capability contract.
