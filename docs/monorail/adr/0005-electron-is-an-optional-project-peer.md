# 0005. Treat Electron as an optional project peer

- Status: Accepted
- Date: 2026-07-24

## Context

Rselectron must use the Electron version chosen by the application. Installing or choosing Electron on the application's behalf would cross the product boundary and could silently select a different runtime from the one used for packaging.

Modern npm versions install non-optional peer dependencies when they can resolve them. A normal Electron peer would therefore conflict with the requirement that Rselectron does not install Electron. Other package managers also differ in peer-install and hoisting behavior, so resolving Electron relative to the Rselectron package is not a reliable substitute for resolving it from the application.

electron-vite 6.0.0-beta.1 does not declare Electron as a peer. Its runtime creates a `require` relative to electron-vite itself and resolves `electron` and `electron/package.json` through that resolver. This often reaches the application's installation in flat layouts, but it does not explicitly establish the application root as the resolution authority and can behave differently with strict or isolated dependency layouts.

## Decision

The public `rselectron` package declares Electron as an optional peer dependency. The optional declaration communicates the integration without causing Rselectron to install or own Electron.

`dev` and `preview` must resolve Electron from the application root. Failure to resolve a valid project-local Electron is a structured `RselectronError` that identifies the command, application root, and corrective action.

`build` resolves and validates project-local Electron only when normalized configuration still requires Electron-derived Node or Chrome targets, format capability checks, or other runtime-version facts. If every such value is explicitly configured and valid, a source build does not require Electron to be installed. When derivation is required and Electron cannot be resolved, `build` fails with a structured error rather than guessing or silently using Rselectron's own dependency graph.

An explicit Electron executable override changes what `dev` or `preview` launches, but it does not provide package metadata for target derivation. Target derivation still requires either a resolvable project-local Electron package or explicit target configuration.

Each Rselectron release freezes an Electron support snapshot containing the three stable majors supported by Electron at that release time. The snapshot is written to release metadata, the optional peer range, and documentation; it does not drift after publication. Electron's official release metadata is the source for Node and Chromium versions. For each supported major, target defaults use the Node and Chromium versions from that major's first stable release, which is conservative for later compatible releases in the same major. CI exercises the latest maintained release of the oldest and newest majors in the snapshot on every supported operating system. A project-local Electron outside the snapshot fails with a structured unsupported-version error.

The package manifest's `type`, the selected Electron major, and each Main or Preload role's `electron.format` determine module format. `electron.format: auto` derives a valid format; explicit `cjs` or `esm` is validated against Electron capability and package semantics. Main and Preload target derivation uses the support-snapshot metadata rather than a permissive fallback.

If `electron.execPath` does not resolve to the executable belonging to the project-local Electron package, Rselectron will launch it only when all runtime-dependent targets and Main/Preload formats are explicit. Auto derivation is rejected because the package metadata and launched runtime cannot be proven consistent. Rselectron never launches an arbitrary executable merely to inspect its version.

## Consequences

- npm does not auto-install Electron merely because `rselectron` is installed.
- The application remains the authority for its Electron runtime across npm, pnpm, Yarn, and Bun layouts.
- Source-only builds can run without Electron when no Electron facts need to be inferred.
- Launch and target derivation cannot accidentally use different hoisted Electron installations.
- Errors for missing Electron become part of the stable structured-error surface.
- A published Rselectron version has reproducible support semantics even after Electron releases another major.
- Custom Electron distributions remain usable, but cannot borrow unverifiable target facts from a different installation.

## Alternatives considered

### Declare Electron as a required peer

Rejected because npm can install required peers automatically and because source-only builds with explicit targets do not always need Electron.

### Do not declare Electron and rely on ambient module resolution

Rejected because strict dependency layouts may not expose the application's Electron installation to Rselectron and the selected runtime becomes layout-dependent.

### Bundle Electron or add it as a direct dependency

Rejected because Rselectron does not own runtime installation or runtime-version selection.

### Allow the executable override to determine target versions

Rejected because an executable path does not reliably expose package metadata without launching an arbitrary binary, and launching it during configuration would add side effects and trust concerns.

### Resolve the support window dynamically

Rejected because the same Rselectron version would accept different Electron versions over time and CI could not reproduce the runtime policy.

### Accept every Electron major above a minimum

Rejected because future majors can change module and runtime capabilities that the published Rselectron version has never tested.
