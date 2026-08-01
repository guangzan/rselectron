# Rselectron Domain Context

## Product

**Rselectron**  
Rsbuild-first tooling that coordinates development and source builds for Electron applications. It is not a Vite compatibility layer, an application packager, or a project scaffolder.

**Capability baseline**  
The frozen electron-vite release whose observable capabilities are used to build Rselectron's compatibility matrix. The target is electron-vite 6.0.0; until that release exists, 6.0.0-beta.1 is the provisional baseline.

**Capability parity**  
Coverage of the applicable entries in the compatibility matrix, subject to documented parity exceptions. It does not mean API, configuration, plugin, or implementation compatibility with electron-vite.

**Parity exception**  
A baseline capability that Rselectron intentionally excludes. Vite plugins, bytecode compilation, and electron-vite's exported SWC helper are parity exceptions.

**Compatibility matrix**  
The acceptance record that maps each capability in the baseline to Rselectron support, a documented parity exception, or a deferred milestone.

## Application model

**Application root**  
The directory against which the Electron application's source locations, output locations, and default package manifest are resolved.

**Application manifest**  
The package manifest that describes the Electron application. By default it is the `package.json` at the application root; an application may select another manifest.

**Electron entry**  
The executable application entry used to launch Electron in development or preview. The application manifest's `main` field is authoritative unless an explicit override is supplied.

**Project-local Electron**  
The Electron installation selected from the application root. It is the authority for launching the application and, when needed, deriving source-build targets.

**Role**  
One of the three independently configured source-build responsibilities: Main, Preload, or Renderer.

**Main role**  
The role that produces code for Electron's main process.

**Preload role**  
The role that produces code loaded as a preload script by renderer web contents.

**Renderer role**  
The role that serves or produces browser-facing renderer content. Multiple pages belong to this single role; windows and pages are not separate Rselectron domain objects.

**Role configuration**  
The complete Rsbuild configuration for one role, extended with Rselectron-owned Electron behavior for that role.

**Role preset**  
Rselectron's defaults and invariants for a role. A preset may be overridden where safe, while role identity constraints remain enforced. Unset `output.distPath` receives the Conventional role outputs layout; other preset values (targets, formats, Node entry naming) are owned by their respective contracts.

**Conventional role outputs**  
The default Role output roots when `output.distPath` is unset: `out/main`, `out/preload`, and `out/renderer`, resolved against the Application root (not against each Role `root`). Explicit `distPath` (string or object with `root`) always wins.

**Role module format**  
The module system used for a Main or Preload source-build output: `cjs` or `esm`. It is derived from Electron capability, the application manifest `"type"`, and the role-level `electron.format`, and is applied through Rsbuild `output.module`.

**Format-aware externalization**  
The rule that Main/Preload dependency externalization must emit externals compatible with the role module format—ESM via `module-import` (and `node-commonjs` for `require`-originated externals), CJS via CommonJS—rather than always forcing CommonJS `require`.

**Import-only external risk**  
Under a CJS Main/Preload role, a CommonJS-externalized request (including a package subpath) whose resolved package entry/`exports` offer no usable `require`/`default`/`main` CJS path—only `import` / `module` / `"type": "module"` style signals. The build can succeed while runtime `require` of that request fails. Mitigations: `externalizeDeps.include` (bundle), or switch the role to ESM; advanced apps may keep a native dynamic `import()` via bundler ignore comments.

**Entry filename policy**  
The default unhashed entry filename pattern for Main/Preload when `output.filename` is unset: `[name].mjs` for ESM, `[name].cjs` for CJS under `"type": "module"`, otherwise `[name].js`. Explicit filenames win; dangerous overrides warn.

**On-demand ESM require shim**  
A thin `createRequire(import.meta.url)` injection used only when an ESM Main/Preload output still contains free `require(` / `require.resolve(`. It does not replace Rspack's `node-module` handling of `__dirname` / `__filename`.

**Application Electron options**  
Electron launch and application-discovery behavior shared by the application rather than by a source-build role.

**Source build**  
Compilation of configured roles into Electron-consumable files. A source build does not create an installer or distributable application package.

## Development lifecycle

**Development session**  
The coordinated lifetime of configured role builders, the renderer development server, and the Electron child process.

**Configuration generation**  
One evaluation of the Rselectron configuration and the coordinated role instances created from it. A configuration change replaces the whole generation.

**Role update**  
A successful rebuild of a watched Main or Preload role. A Main update restarts Electron; a Preload update requests a full reload from every connected renderer page.

**Successful generation**  
A complete, error-free output generation for one role that is eligible to become active.

**Last-known-good generation**  
The most recent successful generation of a role. Failed generations never replace it.

**Renderer-only session**  
A development session that serves the Renderer role while reusing previously built Main and Preload outputs. Required reused outputs must exist before the session starts.

## Compatibility and support

**Supported Electron major**  
An Electron major included in the support snapshot of a particular Rselectron release.

**Electron support snapshot**  
The three Electron stable majors officially supported when a Rselectron version is released. The snapshot remains fixed for that Rselectron version. Each major records Node and Chromium version strings used for derived compiler targets.

**Derived compiler target**
The compiler-target values filled when the role does not set an explicit compiler target (`output.overrideBrowserslist` or `tools.rspack.target`). Main and Preload receive `tools.rspack.target: electron${N}-main` / `electron${N}-preload`. Renderer receives `output.overrideBrowserslist: ['chrome >= ${min(M, K)}']` where `M` is the support-snapshot Chromium major and `K` is the hard-coded browserslist-rs ceiling (**138** today)—not `electron${N}-renderer`, and not a Vite-style `chrome${M}` string on `tools.rspack.target`. Rsbuild then composes the Rspack target (typically `['web', 'browserslist:…']`). Clamp is silent when `M > K`; remove the clamp after browserslist-rs covers snapshot Chromium. Rsbuild `output.target` (`web` / `node`) is an environment preset and does not suppress Chromium browserslist derivation.

**Host support**  
Running Rselectron on macOS, Linux, or Windows on an x64 or arm64 host. Host support does not imply cross-compilation of native addons.

## Configuration vocabulary

**Command**  
An explicit Rselectron operation: Dev, Build, Preview, or Inspect.

**Build mode**  
Rsbuild's compilation mode: Development, Production, or None.

**Environment mode**  
The independently selected environment-file namespace. It does not choose the build mode.
