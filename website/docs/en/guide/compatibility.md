---
title: Compatibility
description: Electron versions, hosts, frameworks, and intentional exclusions.
---

# Compatibility

## Electron versions

Supported Electron majors are **41–43**. The optional peer range is `>=41 <44`. Release metadata, docs, and CI use the same range.

You can also read it from the package:

```ts
import { ELECTRON_SUPPORT_SNAPSHOT } from 'electron-rstack';
```

## Hosts and packaging

Hosts cover macOS, Linux, and Windows (x64 / arm64) where CI hardware exists. Host support does **not** mean native addons can be cross-compiled.

Rselectron covers development and source builds only. Consuming outputs with electron-builder, Electron Forge, and similar tools is expected; Rselectron does not produce installers.

## Frameworks

Vanilla and React are the official examples. Other UI frameworks work through normal Rsbuild plugins. Rselectron does not maintain a separate framework matrix.

## Intentional exclusions

Compared with electron-vite, these capabilities are intentionally out of scope:

| Capability | Rselectron stance |
| --- | --- |
| Vite plugins | Not accepted or translated — use Rsbuild / Rspack plugins |
| V8 bytecode compilation | Not implemented — no silent fallback |
| electron-vite SWC helpers | Not exported — configure SWC via Rsbuild / Rspack |

See the repository [compatibility matrix](https://github.com/guangzan/electron-rstack/blob/main/docs/monorail/compatibility-matrix.md) and [Migration](./migration).
