---
title: Troubleshooting
description: How to diagnose common failures and recover.
---

# Troubleshooting

Also see [Rsbuild troubleshooting](https://rsbuild.rs/guide/troubleshooting/index) and the [Rspack FAQ](https://rspack.rs/misc/faq).

If these tips are not enough, search or open an issue on [GitHub](https://github.com/guangzan/rselectron/issues).

## Tips

1. **During development** — use breakpoints or `debugger`.
2. **Before packaging** — run `rselectron preview` to catch production-build issues early.
3. **Check config** — run `rselectron inspect --format human` before chasing compiler or launch failures. Inspect shows normalized, Rsbuild, and Rspack layers — see [JavaScript API · inspect](/api/javascript-api#inspect) and [CLI](/api/cli).
4. **Close handles** — always call `close()` on handles from `createServer` / `build` / `preview`; repeated calls are safe.

## Development

### Electron not found

**Code:** `RSELECTRON_ELECTRON_NOT_FOUND`

Install Electron at the project root (or ensure the selected manifest resolves to a project-local install). Rselectron does not download Electron for you. Supported versions: [Compatibility](./compatibility).

### Missing main / preload / renderer config

**Code / warning:** `RSELECTRON_ROLE_MISSING`

Omitting a process on purpose is allowed. If you expected it to build, add the matching key under `defineConfig`. See [Main, preload, and renderer](/config/processes).

### `--renderer-only` will not start

`--renderer-only` skips main and preload builds and reuses prior outputs. Run a full `rselectron dev` (or `build`) at least once first, and keep those outputs valid. Do not keep using this flag after changing main or preload sources. Flag details: [CLI](/api/cli).

### Renderer looks like a Node / Electron Renderer target

When the renderer target looks like Node, `electron*-main|preload`, or an explicit `electron-renderer` / `electron*-renderer`, Rselectron emits `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`. The default sandboxed path derives `output.overrideBrowserslist: ['chrome >= ${min(M, 138)}']` from the Electron support snapshot (clamped to today's browserslist-rs ceiling; see [browserslist-rs#48](https://github.com/browserslist/browserslist-rs/issues/48)). Rsbuild then composes a web + browserslist Rspack target. You can still set `tools.rspack.target: 'web'` explicitly as an escape hatch. Unless you intentionally enable `nodeIntegration`, do not override with a hand-written `electron*-renderer`.

### Config change restarts everything

A watched configuration dependency change reloads the whole configuration generation and replaces the development session. Partial hot replacement of config is not supported — see [Concepts](./concepts).

## Build

### `build` rejects watch

Production `build` is finite and does not support process-selective watch (`RSELECTRON_BUILD_WATCH_UNSUPPORTED`). For main / preload hot reload use:

```bash
rselectron dev --watch
# or
rselectron dev --watch=main
rselectron dev --watch=preload
```

See [CLI](/api/cli).

### Import-only package fails under CJS main / preload

**Code / warning:** `RSELECTRON_IMPORT_ONLY_EXTERNAL`

**Symptoms:** the Main or Preload build succeeds, but Electron fails at launch or first use with `ERR_REQUIRE_ESM`, `is not a function`, or a similar `require` of an ESM-only module. This happens when the role format is CJS and format-aware externalization emits a CommonJS external for an import-only package (or subpath). Rspack may rewrite static or dynamic `import` to `require`; the break shows up only at runtime.

**Primary fixes:**

1. Bundle the package with `electron.externalizeDeps.include` (see [Electron options · externalizeDeps](/config/electron#externalizedeps)).
2. Or switch that role to `electron.format: 'esm'`.

Coming from electron-vite: the same class of failure is documented as `ERR_REQUIRE_ESM` / ESM-only dependencies. electron-vite’s bundle escape is named `exclude`; in Rselectron the same intent is `include`.

Rselectron does not auto-include import-only packages. Advanced apps may keep a native dynamic `import()` with a bundler ignore comment (for example `/* webpackIgnore: true */`); that path does not silence `RSELECTRON_IMPORT_ONLY_EXTERNAL`.

## Preview

### Skip rebuilding

```bash
rselectron preview --skip-build
```

Use only when outputs are already up to date.
