# 0001. Target capability parity, not drop-in compatibility

- Status: Accepted
- Date: 2026-07-24

## Context

electron-vite is the product reference, but its public surface is coupled to Vite and includes capabilities that do not fit an Rsbuild-first tool. Calling the goal “full compatibility” would imply configuration, plugin, and API interchangeability that Rselectron does not provide.

The currently available reference checkout is electron-vite 6.0.0-beta.1. Its configuration exposes Main, Preload, and Renderer Vite configurations, and its implementation includes Vite plugins, bytecode support, and an exported SWC helper.

## Decision

Rselectron targets capability parity through the versioned [electron-vite compatibility matrix](../compatibility-matrix.md) rather than drop-in compatibility.

The matrix baseline is frozen at electron-vite 6.0.0 final. Until final is available, 6.0.0-beta.1 is the provisional matrix source. Vite plugins, bytecode compilation, and the electron-vite SWC helper are documented parity exceptions.

Rselectron accepts and exports Rsbuild plugins only. Electron lifecycle behavior remains owned by Rselectron and is not exposed as a separate plugin protocol.

Before 1.0, releases may use alpha or canary channels. “1.0 parity” means that every applicable matrix entry is implemented and every excluded entry is explicitly documented; it does not mean complete electron-vite compatibility.

Rselectron owns source development and source builds only. Application packaging remains the responsibility of tools such as electron-builder and Electron Forge. A project scaffolder is a separate, post-core milestone rather than part of the 1.0 build-tool contract.

Renderer multipage applications use Rsbuild's HTML and multipage facilities within the single Renderer role. Rselectron does not introduce named windows as domain objects.

## Consequences

- Migration documentation must describe semantic mappings and exceptions rather than promise config-file substitution.
- Compatibility claims can be tested against a stable matrix.
- New electron-vite capabilities do not silently expand Rselectron's scope after the baseline freezes.
- Rsbuild remains the native extension surface.
- Packaging integrations compose with Rselectron outputs instead of becoming Rselectron subsystems.
- Window lifecycle and routing remain application concerns.

## Alternatives considered

### Provide a drop-in electron-vite replacement

Rejected because accepting Vite configuration and plugins would undermine the Rsbuild-first boundary and create two incompatible extension models.

### Claim full parity while listing exceptions

Rejected because “full parity” is contradicted by intentional exclusions and would make the 1.0 acceptance criterion ambiguous.

### Include packaging and scaffolding in the core product

Rejected because source compilation, distributable packaging, and project generation have different lifecycles and extension ecosystems.
