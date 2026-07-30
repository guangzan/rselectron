# 0008. Gate releases with cross-platform evidence

- Status: Accepted
- Date: 2026-07-24

## Context

Rselectron coordinates compilers, filesystem promotion, development servers, and Electron processes. Unit tests on one operating system cannot validate process shutdown, file replacement, package-manager isolation, or Electron runtime compatibility. Likewise, a parity claim without fixtures and migration documentation would be subjective.

## Decision

The repository standardizes on:

- pnpm through Corepack for repository dependency management;
- Rslib for package builds;
- Rstest for unit and integration tests;
- Playwright's Electron support for end-to-end tests;
- exact, lockfile-pinned Rslint and Prettier versions for static checks and formatting;
- Changesets for versioning, alpha/canary publication, changelogs, and npm provenance.

GitHub Actions is the required release and continuous-integration environment. Upgrading Rslint or Prettier requires an explicit dependency change and must pass formatting, static analysis, type checking, unit, integration, and applicable end-to-end checks before merge.

Rselectron is MIT licensed and contains no telemetry or undisclosed network reporting.

The documentation site uses Rspress and provides complete English and Simplified Chinese navigation and content. It includes concepts, configuration, CLI, programmatic API, troubleshooting, compatibility, and electron-vite migration material. The complete bilingual requirement also applies to maintained repository documentation, including ADRs and `CONTEXT.md`; neither language is a permanently reduced subset. English may be the temporary authoring source while a decision is being drafted, but a stable 1.0 release requires its Simplified Chinese equivalent to be present and current.

Examples and test fixtures are separate:

- examples are maintained learning artifacts;
- fixtures are minimal automated verification inputs and may be intentionally unnatural.

Vanilla and React applications are official end-to-end acceptance examples. Other UI frameworks are supported through normal Rsbuild plugin compatibility rather than a separate Rselectron framework matrix.

A stable 1.0 release requires:

- unit and integration suites;
- Vanilla and React Electron end-to-end suites;
- macOS, Linux, and Windows coverage;
- x64 and arm64 host coverage where CI hardware is available, with no claim of native-addon cross-compilation;
- the oldest and newest majors in the release's Electron support snapshot;
- packed-tarball installation and public API/CLI execution outside the workspace;
- transactional rebuild and shutdown coverage.

Rselectron maintains an equivalent fixture benchmark against the frozen electron-vite baseline. Benchmarks record environment and distributions and detect material regressions, but no fixed speed multiplier is promised.

## Consequences

- 1.0 is an evidence gate rather than a calendar label.
- Windows filesystem and process behavior is tested directly.
- Documentation and migration gaps can block a stable release.
- Missing or stale translations of maintained documentation can block a stable release.
- Framework support claims remain proportional to what Rselectron actually owns.
- Benchmark changes inform regressions without turning one machine's ratio into a compatibility promise.
- Tooling upgrades are deliberate, reviewable changes rather than implicit version drift.

## Alternatives considered

### Test only the current development platform

Rejected because process and filesystem behavior differs materially across the three supported operating systems.

### Keep examples as end-to-end fixtures

Rejected because educational examples and minimal regression fixtures evolve for different reasons.

### Publish English documentation first and translate selected pages

Rejected because the confirmed product documentation contract is a complete bilingual site.

### Promise a fixed performance multiplier over electron-vite

Rejected because toolchain versions, fixture characteristics, caches, and hardware can dominate the measured ratio.
