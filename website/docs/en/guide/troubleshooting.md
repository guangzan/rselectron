---
title: Troubleshooting
description: How to diagnose common failures and recover.
---

# Troubleshooting

Also see [Rsbuild troubleshooting](https://rsbuild.rs/guide/troubleshooting/index) and the [Rspack FAQ](https://rspack.rs/misc/faq).

If these tips are not enough, search or open an issue on [GitHub](https://github.com/guangzan/Rselectron/issues).

## Tips

1. **During development** — use breakpoints or `debugger`.
2. **Before packaging** — run `rselectron preview` to catch production-build issues early.
3. **Check config** — run `rselectron inspect --format human` before chasing compiler or launch failures.
4. **Close handles** — always call `close()` on handles from `createServer` / `build` / `preview`; repeated calls are safe.

## Development

### Electron not found

**Code:** `RSELECTRON_ELECTRON_NOT_FOUND`

Install Electron at the project root (or ensure the selected manifest resolves to a project-local install). Rselectron does not download Electron for you. Supported versions: [Compatibility](./compatibility).

### Missing main / preload / renderer config

**Code / warning:** `RSELECTRON_ROLE_MISSING`

Omitting a process on purpose is allowed. If you expected it to build, add the matching key under `defineConfig`.

### `--renderer-only` will not start

`--renderer-only` skips main and preload builds and reuses prior outputs. Run a full `rselectron dev` (or `build`) at least once first, and keep those outputs valid. Do not keep using this flag after changing main or preload sources.

### Renderer looks like a Node target

When the renderer output target looks like Node / Electron-main, Rselectron emits `RSELECTRON_RENDERER_NODE_INTEGRATION_RISK`. Unless you intentionally enable `nodeIntegration`, use a browser-oriented renderer target.

## Build

### `build` rejects watch

Production `build` is finite and does not support process-selective watch. For main / preload hot reload use:

```bash
rselectron dev --watch
# or
rselectron dev --watch=main
rselectron dev --watch=preload
```

## Preview

### Skip rebuilding

```bash
rselectron preview --skip-build
```

Use only when outputs are already up to date.
