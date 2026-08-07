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
