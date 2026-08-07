# 0012. Rsbuild stays a required project peer with a warn-only tested window

- Status: Accepted
- Date: 2026-08-07
- Related: [0002-independent-rsbuild-instance-per-role.md](./0002-independent-rsbuild-instance-per-role.md), [0005-electron-is-an-optional-project-peer.md](./0005-electron-is-an-optional-project-peer.md)

## Context

`@rselectron/core` declares `@rsbuild/core: ^2.0.0` as a **required** peer dependency and statically imports it (`createRsbuild`, `loadConfig`, types) — Rsbuild is the engine of every Rselectron operation, unlike Electron, which is an optional peer. Two practical complaints motivate revisiting the packaging of this dependency:

- **Install friction**: applications must install `@rsbuild/core` themselves, which adds a manual step (mainly affecting yarn classic / bun, and any strict layout where auto-install is disabled).
- **Version drift**: the `^2.0.0` peer range admits any 2.x release, while Rselectron's internals are tested against one pinned version. A newer Rsbuild minor could change behavior under Rselectron.

The straightforward fix for both — making `@rsbuild/core` a built-in exact-pinned direct dependency — fails against the plugin ecosystem. `@rsbuild/plugin-react` (the flagship example) imports `{ rspack } from '@rsbuild/core'` at runtime, and the whole plugin ecosystem declares `@rsbuild/core` as an (optional) peer resolved from the application tree. With a direct dependency, plugin-using applications would still need `@rsbuild/core` installed (pnpm's strict layout cannot resolve the plugin's peer to a nested copy under `@rselectron/core`), yielding **two copies** of Rsbuild with potentially divergent Rspack versions: duplicated native bindings, and a new identity split between Rselectron's instance and the plugin stack's `rspack`. Bundling Rsbuild into the published artifact is not viable either: it ships native `@rspack/binding` binaries and dynamic asset/worker files that a bundler cannot vendor.

The required-peer model is the only shape that guarantees one shared Rsbuild instance for Rselectron, the application config, and the plugin ecosystem — consistent with ADR 0002's "accept the full Rsbuild configuration surface" philosophy. Unlike Electron (ADR 0005), there is no "application owns the runtime" argument that forces the peer: Rsbuild is a build tool, not a launched runtime. The peer is kept because of the plugin ecosystem's single-identity requirement, not by analogy with Electron.

## Decision

Keep `@rsbuild/core` as a **required peer dependency** of the public facade, and add a **warn-only tested-window diagnostic** to address version drift:

- Each Rselectron release freezes an **Rsbuild tested window**: the minor line of the `@rsbuild/core` version pinned in that release's development dependency set (tested against `2.1.7` → window `>=2.1.0 <2.2.0`). Patch-level updates within the tested minor line are presumed safe and produce no diagnostic.
- `dev`, `build`, `inspect`, and `preview` resolve the project-local `@rsbuild/core` (which, under the peer model, is the same copy Rselectron imports) and read its version. Outside the tested window, Rselectron emits a structured warn-level diagnostic; it never blocks the run.
- The peer range stays `^2.0.0` — the install contract is deliberately wider than the tested window. Rselectron does not reject or prevent applications from using newer Rsbuild versions; it only reports that a version was not tested by this Rselectron release.
- The window is frozen per release in release metadata alongside `ELECTRON_SUPPORT_SNAPSHOT`, so a published Rselectron version has reproducible diagnostics.
- This is the inverse of the Electron snapshot policy (ADR 0011): Electron versions outside the window are hard-rejected because Rselectron derives compiler targets from per-major runtime metadata; Rsbuild versions outside the window are only warned because the application owns its build tool and the failure surface is the application's own build.
- Install friction is addressed without bundling: docs and examples state the `@rsbuild/core` dependency explicitly (npm 7+ and pnpm 8+ already auto-install required peers by default).

## Consequences

- Applications keep a single shared `@rsbuild/core` across Rselectron, config, and plugins; no dual-copy risk and no duplicate native bindings.
- A project pinning an untested Rsbuild minor receives an actionable warning naming the tested window, instead of silently running on an untested version.
- The peer range and the tested window are two distinct contracts (install vs. verification); tests and docs must keep them distinct.
- Release metadata grows one more frozen entry (`RSBUILD_TESTED_WINDOW` or equivalent); release-candidate tests assert its presence alongside the Electron snapshot.

## Alternatives considered

### Make `@rsbuild/core` an exact-pinned direct dependency

Rejected: plugin-using applications still need their own copy (runtime import + peer resolution), producing dual Rsbuild/Rspack copies with divergent versions, larger installs, and an identity split between Rselectron's instance and the plugin stack. It fixes vanilla-app friction and Rselectron-internal determinism at the cost of the ecosystem-wide single-copy guarantee.

### Bundle/vendor Rsbuild into the published artifact

Rejected: not technically viable — `@rspack/binding` native binaries and dynamic asset/worker files cannot be vendored by a bundler without breaking resolution.

### Keep the peer but hard-error outside the tested window

Rejected: the application owns its build tool; a hard error would block applications from using newer Rsbuild versions and is not justified by any target-derivation need (unlike Electron).

### Warn on any patch-level difference from the tested version

Rejected: patch releases are bugfix semantics; warning on every patch difference would be noise and would erode trust in the diagnostic.

### Widen the tested window to the whole major

Rejected: the window would coincide with the peer range and carry no verification signal.
