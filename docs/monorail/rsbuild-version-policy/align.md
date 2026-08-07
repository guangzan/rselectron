# Align: Rsbuild stays a required project peer + warn-only tested window

## Intent

Answer whether `@rsbuild/core` should become a built-in (直接依赖) of `@rselectron/core` to reduce install friction and eliminate version drift. Conclusion: **no** — keep the required peer, add a warn-only tested-window diagnostic, and finish the friction story in docs/examples. The plugin ecosystem (`@rsbuild/plugin-react` imports `{ rspack } from '@rsbuild/core'` at runtime; every plugin peers on the app's `@rsbuild/core`) makes a built-in produce two divergent Rsbuild/Rspack copies for exactly the plugin-using applications Rselectron targets; bundling Rsbuild is not viable (native bindings, dynamic assets).

## Decisions settled

- **Direction**: `@rsbuild/core` stays a required peer (`^2.0.0`); no direct dependency, no vendoring. The peer is kept for the plugin ecosystem's single-copy identity, not by analogy with Electron's optional peer.
- **Drift control**: each release freezes an **Rsbuild tested window** — the minor line of the `@rsbuild/core` version in that release's devDependency set (e.g. tested `2.1.7` → `>=2.1.0 <2.2.0`). Patch updates within the tested minor line are silent.
- **Strictness**: warn-only structured diagnostic for out-of-window versions; never a hard error. The application owns its build tool; this is the inverse of the Electron snapshot policy (ADR 0011), which hard-rejects because targets derive from per-major runtime metadata.
- **Contracts**: peer range (`^2.0.0`, install contract) stays deliberately wider than the tested window (verification contract). Both are frozen per release; the window lives in release metadata next to `ELECTRON_SUPPORT_SNAPSHOT`.
- **Friction**: addressed in docs/examples (npm 7+ / pnpm 8+ already auto-install required peers; manual declaration is only meaningful for yarn classic / bun).
- **Firing surface**: `dev`, `build`, `inspect`, `preview` resolve the project-local `@rsbuild/core` (the same copy Rselectron imports under the peer model) and emit the diagnostic.

## Deferred

- **Diagnostic code/name and exact metadata key** (e.g. `RSBUILD_TESTED_WINDOW`): spec-time detail.
- **Scaffolder (`rselectron init`)**: explicitly out of scope for this align; docs-only friction handling is the decision.

## Out of scope

- Bundling/vendoring Rsbuild into the published artifact (rejected: native binaries and dynamic assets cannot be vendored).
- Making `@rsbuild/core` optional or removing the peer declaration.
- Hard-erroring on out-of-window Rsbuild versions.
- Warning on patch-level differences within the tested minor line.
- Any change to the Electron support snapshot or ADR 0005 / 0011.

## Domain pointers

- Glossary: [Rsbuild tested window](../../CONTEXT.md) (and [CONTEXT.zh.md](../../CONTEXT.zh.md)) — new term defining the frozen minor-line window and its warn-only contrast with the Electron snapshot.
- ADR: [0012-rsbuild-remains-a-required-project-peer.md](../../adr/0012-rsbuild-remains-a-required-project-peer.md) (new; en + zh), related to [0002-independent-rsbuild-instance-per-role.md](../../adr/0002-independent-rsbuild-instance-per-role.md) and [0005-electron-is-an-optional-project-peer.md](../../adr/0005-electron-is-an-optional-project-peer.md).
