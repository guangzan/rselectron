---
title: Compatibility
description: Electron versions, hosts, frameworks, and intentional exclusions.
---

# Compatibility

Rselectron targets **capability parity** with a frozen electron-vite baseline, subject to documented **parity exceptions**. That is **not** drop-in replacement of Vite configs, plugins, or electron-vite APIs. The acceptance record is the repository [compatibility matrix](https://github.com/guangzan/rselectron/blob/main/docs/monorail/compatibility-matrix.md).

## Electron versions

Rselectron freezes an Electron support window per release: a fixed floor at Electron **28** (the first ESM-capable major) and a rolling top at the three stable majors current at release time (today: **43**). The window is **28–43**, and the optional peer range is `>=28 <44`. Release metadata, docs, and CI use the same frozen window; it does not drift after publication.

You can also read it from the package:

```ts
import { ELECTRON_SUPPORT_SNAPSHOT } from '@rselectron/core';
```

## Rsbuild versions

`@rsbuild/core` is a **required project peer** (`^2.0.0` install contract) that the application declares. npm 7+ and pnpm 8+ auto-install required peers, so a manual declaration is only needed for other package managers (for example yarn classic or bun, or any layout where auto-install is disabled).

Each Rselectron release also freezes an **Rsbuild tested window**: the minor line of the `@rsbuild/core` version that release was tested against (tested `2.1.7` → window `>=2.1.0 <2.2.0`). Patch updates within the tested minor line are presumed safe and produce no output. A project-local `@rsbuild/core` outside the window produces a warn-only `RSELECTRON_RSBUILD_UNTESTED` diagnostic across `dev`, `build`, `inspect`, and `preview` — never a hard error, because the application owns its build tool. This contrasts with the [Electron versions](#electron-versions) window above, where out-of-window versions are hard-rejected because Rselectron derives compiler targets from per-major Electron metadata.

## Hosts and packaging

Hosts cover macOS, Linux, and Windows (x64 / arm64) where CI hardware exists. Host support does **not** mean native addons can be cross-compiled.

Rselectron covers development and source builds only. Consuming outputs with electron-builder, Electron Forge, and similar tools is expected; Rselectron does not produce installers.

## Frameworks

Vanilla and React are the official examples under [`examples/`](https://github.com/guangzan/rselectron/tree/main/examples). Other UI frameworks work through normal Rsbuild plugins. Rselectron does not maintain a separate framework matrix.

## Intentional exclusions (parity exceptions)

Compared with electron-vite, these capabilities are intentionally out of scope:

| Capability                | Rselectron stance                                         |
| ------------------------- | --------------------------------------------------------- |
| Vite plugins              | Not accepted or translated — use Rsbuild / Rspack plugins |
| V8 bytecode compilation   | Not implemented — no silent fallback                      |
| electron-vite SWC helpers | Not exported — configure SWC via Rsbuild / Rspack         |

See [Migration](./migration) for a semantic mapping checklist.
