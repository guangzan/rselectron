# 0004. Publish one facade package

- Status: Accepted
- Date: 2026-07-24

## Context

Rselectron needs internal boundaries between core orchestration, CLI behavior, and the public package, but publishing those boundaries as separate packages would expose version coordination and installation choices before they provide user value.

Private workspace packages can be used as source boundaries only if the public artifact is self-contained. A published facade that retains runtime imports or generated type references to private workspace package names would be broken for consumers.

## Decision

The workspace contains private `packages/core` and `packages/cli` packages plus one public `packages/rselectron` facade. Only the npm package `rselectron` is published.

Rslib builds the public facade so that all required private-workspace runtime code and public type declarations are included in the `rselectron` artifact. Published JavaScript, declarations, exports, and package metadata must not reference private workspace package specifiers.

Packaging verification must install the produced tarball in an external fixture and exercise both the public API and CLI before release.

Rselectron itself is ESM-only. The repository uses pnpm through Corepack; consumers may use npm, pnpm, Yarn, or Bun.

`@rsbuild/core` 2.x is a required peer and Electron is an optional peer governed by ADR 0005. Rselectron does not fork or bundle Rsbuild. The repository lockfile and scripts are pnpm-only, but the packed artifact must not depend on pnpm workspace resolution.

## Consequences

- Consumers install and version one package.
- Internal packages can be extracted publicly later without committing to that topology now.
- Bundling and declaration generation are release-critical, not incidental build details.
- Tarball inspection and isolated consumer tests are required to prevent workspace-only success.
- The facade must preserve one copy of peer-owned Rsbuild types rather than bundling an incompatible duplicate.

## Alternatives considered

### Publish core, CLI, and facade packages

Rejected because it exposes internal decomposition and cross-package versioning without a current consumer need.

### Keep all source in one package

Rejected because the intended internal boundaries are useful for ownership and future extraction, while a self-contained facade can preserve a one-package public surface.
