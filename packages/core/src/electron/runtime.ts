import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import type { RsbuildConfig } from '@rsbuild/core';
import { RselectronError } from '../errors.ts';
import type {
  ApplicationElectronConfig,
  Diagnostic,
  Role,
  RoleConfig,
  RoleModuleFormat,
} from '../types.ts';
import { applyAssetHandling } from './asset.ts';
import {
  defaultEntryFilenamePattern,
  entryFilenameRiskWarning,
  explicitJsFilename,
  isDangerousEntryFilename,
} from './entry.ts';
import { applyExternalization } from './externalize.ts';
import { applyNativeAssetHandling } from './native.ts';
import { applyEsmRequireShim } from './shim.ts';
import { applyWorkerHandling } from './worker.ts';
import { resolveProjectElectron, type ProjectElectron } from './resolve.ts';
import {
  ELECTRON_SUPPORT_SNAPSHOT,
  electronChromeBrowserslist,
  electronRspackTarget,
} from './snapshot.ts';

export interface RuntimeNormalization {
  formats: Partial<Record<Role, RoleModuleFormat>>;
  launchExecPath?: string;
  electron?: ProjectElectron;
  pendingWarnings: Diagnostic[];
  roles: Partial<Record<Role, RoleConfig>>;
  targets: Partial<Record<Role, string[]>>;
  warnings: Diagnostic[];
}

interface ApplicationManifest {
  type?: string;
}

/**
 * Conventional role outputs (ADR 0007): unset distPath → out/<role> under appRoot.
 */
export function applyConventionalDistPath(
  appRoot: string,
  role: Role,
  config: RoleConfig,
): RoleConfig {
  const dist = config.output?.distPath;
  if (typeof dist === 'string') {
    if (dist.length > 0) {
      return config;
    }
  } else if (
    typeof dist === 'object' &&
    dist !== null &&
    !Array.isArray(dist) &&
    typeof dist.root === 'string' &&
    dist.root.length > 0
  ) {
    return config;
  }

  const root = resolve(appRoot, 'out', role);
  if (typeof dist === 'object' && dist !== null && !Array.isArray(dist)) {
    return {
      ...config,
      output: {
        ...config.output,
        distPath: {
          ...dist,
          root,
        },
      },
    };
  }

  return {
    ...config,
    output: {
      ...config.output,
      distPath: { root },
    },
  };
}

function readManifest(
  appRoot: string,
  packageJson?: string,
): ApplicationManifest {
  const manifestPath = resolve(
    appRoot,
    packageJson === undefined ? 'package.json' : packageJson,
  );
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as ApplicationManifest;
}

function readManifestIfPresent(
  appRoot: string,
  packageJson?: string,
): ApplicationManifest {
  const manifestPath = resolve(
    appRoot,
    packageJson === undefined ? 'package.json' : packageJson,
  );
  if (!existsSync(manifestPath)) {
    return {};
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as ApplicationManifest;
}

function applyEntryFilenamePolicy(
  role: Role,
  config: RoleConfig,
  format: RoleModuleFormat,
  packageType: string | undefined,
): { config: RoleConfig; warning?: Diagnostic } {
  const explicit = explicitJsFilename(config);
  if (explicit === undefined) {
    const pattern = defaultEntryFilenamePattern(format, packageType);
    const existingFilename = config.output?.filename;
    return {
      config: {
        ...config,
        output: {
          ...config.output,
          filename:
            typeof existingFilename === 'object' && existingFilename !== null
              ? { ...existingFilename, js: pattern }
              : { js: pattern },
        },
      },
    };
  }

  if (isDangerousEntryFilename(format, packageType, explicit)) {
    return {
      config,
      warning: entryFilenameRiskWarning(role, explicit),
    };
  }

  return { config };
}

function hasExplicitBrowserslist(config: RoleConfig): boolean {
  return config.output?.overrideBrowserslist !== undefined;
}

function hasExplicitRspackTarget(config: RoleConfig): boolean {
  const rspack = config.tools?.rspack;
  return (
    typeof rspack === 'object' &&
    rspack !== null &&
    !Array.isArray(rspack) &&
    'target' in rspack
  );
}

function hasExplicitCompilerTarget(config: RoleConfig): boolean {
  return hasExplicitBrowserslist(config) || hasExplicitRspackTarget(config);
}

function hasExplicitModule(config: RoleConfig): boolean {
  return config.output?.module !== undefined;
}

function isRiskyRendererTargetValue(value: string): boolean {
  const target = value.trim().toLowerCase();
  if (
    target === 'node' ||
    target === 'async-node' ||
    target === 'node-addons' ||
    target === 'electron-main' ||
    target === 'electron-preload' ||
    target === 'electron-renderer'
  ) {
    return true;
  }
  return /^electron\d+-(main|preload|renderer)$/.test(target);
}

function collectRendererTargetValues(config: RoleConfig): string[] {
  const values: string[] = [];
  const outputTarget = config.output?.target;
  if (typeof outputTarget === 'string') {
    values.push(outputTarget);
  }
  if (hasExplicitRspackTarget(config)) {
    const rspackTarget = (
      config.tools!.rspack as { target?: string | string[] }
    ).target;
    if (Array.isArray(rspackTarget)) {
      values.push(...rspackTarget.map(String));
    } else if (rspackTarget !== undefined) {
      values.push(String(rspackTarget));
    }
  }
  return values;
}

function rendererNodeIntegrationRisk(
  config: RoleConfig,
): Diagnostic | undefined {
  const risky = collectRendererTargetValues(config).filter(
    isRiskyRendererTargetValue,
  );
  if (risky.length === 0) {
    return undefined;
  }
  return {
    code: 'RSELECTRON_RENDERER_NODE_INTEGRATION_RISK',
    message: `Renderer target override (${risky.join(', ')}) is retained but is outside the default web/Chromium security profile and commonly implies nodeIntegration or Node globals in Renderer code.`,
    role: 'renderer',
  };
}

function requestedFormat(
  config: RoleConfig,
): RoleModuleFormat | 'auto' | undefined {
  return config.electron?.format;
}

function roleNeedsFormatDerivation(role: Role, config: RoleConfig): boolean {
  if (role === 'renderer') {
    return false;
  }
  const format = requestedFormat(config);
  if (format === 'auto') {
    return true;
  }
  if (format === 'cjs' || format === 'esm') {
    return false;
  }
  return !hasExplicitModule(config);
}

function roleNeedsTargetDerivation(role: Role, config: RoleConfig): boolean {
  if (hasExplicitCompilerTarget(config)) {
    return false;
  }
  // Renderer: Rsbuild `output.target` is only an env preset and never substitutes
  // for Chromium browserslist derivation (ADR 0010).
  if (role === 'renderer') {
    return true;
  }
  // Main/Preload: an explicit env preset still skips package-backed electron*-
  // target derivation when no compiler target is set (existing fixture contract).
  return config.output?.target === undefined;
}

function needsElectronPackage(
  roles: Array<readonly [Role, RoleConfig]>,
): boolean {
  return roles.some(
    ([role, config]) =>
      roleNeedsFormatDerivation(role, config) ||
      roleNeedsTargetDerivation(role, config),
  );
}

function needsApplicationManifest(
  roles: Array<readonly [Role, RoleConfig]>,
): boolean {
  return roles.some(
    ([role, config]) =>
      role !== 'renderer' && roleNeedsFormatDerivation(role, config),
  );
}

function shouldDeriveElectronTarget(
  config: RoleConfig,
  electronRequired: boolean,
): boolean {
  return electronRequired && !hasExplicitCompilerTarget(config);
}

function deriveFormat(
  config: RoleConfig,
  manifest: ApplicationManifest,
  electron: ProjectElectron | undefined,
): RoleModuleFormat {
  const requested = requestedFormat(config);
  if (requested === 'cjs' || requested === 'esm') {
    if (
      requested === 'esm' &&
      electron !== undefined &&
      !ELECTRON_SUPPORT_SNAPSHOT.byMajor[electron.major]!.esm
    ) {
      throw new RselectronError(
        'RSELECTRON_FORMAT_UNSUPPORTED',
        'electron',
        `Electron ${electron.version} cannot load ESM Main/Preload output.`,
        'Use electron.format: "cjs" or a supported Electron major.',
      );
    }
    return requested;
  }

  if (hasExplicitModule(config)) {
    return config.output!.module ? 'esm' : 'cjs';
  }

  if (electron === undefined) {
    throw new RselectronError(
      'RSELECTRON_ELECTRON_NOT_FOUND',
      'electron',
      'Module format derivation requires project-local Electron.',
      'Install electron in the application or set electron.format / output.module explicitly.',
    );
  }

  const support = ELECTRON_SUPPORT_SNAPSHOT.byMajor[electron.major]!;
  if (manifest.type === 'module') {
    if (!support.esm) {
      throw new RselectronError(
        'RSELECTRON_FORMAT_UNSUPPORTED',
        'electron',
        `Package type is module but Electron ${electron.version} does not support ESM Main/Preload.`,
        'Use electron.format: "cjs" or a supported Electron major.',
      );
    }
    return 'esm';
  }

  return 'cjs';
}

function applyFormat(
  role: Role,
  config: RoleConfig,
  format: RoleModuleFormat,
): RoleConfig {
  if (role === 'renderer') {
    return config;
  }

  const module = format === 'esm';
  if (config.output?.module !== undefined && config.output.module !== module) {
    throw new RselectronError(
      'RSELECTRON_FORMAT_CONFLICT',
      role,
      `${role} electron.format conflicts with output.module.`,
      `Use output.module: ${String(module)} for ${format} output.`,
    );
  }

  return {
    ...config,
    output: {
      ...config.output,
      module,
    },
  };
}

function applyElectronTarget(
  role: Role,
  config: RoleConfig,
  major: number,
): { config: RoleConfig; target: string[] } {
  if (role === 'renderer') {
    const query = electronChromeBrowserslist(major);
    return {
      target: [query],
      config: {
        ...config,
        output: {
          ...config.output,
          overrideBrowserslist: [query],
        },
      },
    };
  }

  const target = electronRspackTarget(major, role);
  const existing = config.tools?.rspack;
  if (typeof existing === 'function' || Array.isArray(existing)) {
    throw new RselectronError(
      'RSELECTRON_TARGET_MERGE_UNSUPPORTED',
      role,
      'Derived Electron targets cannot merge into a function or array tools.rspack value.',
      'Set an explicit tools.rspack.target object or remove the function form when using auto derivation.',
    );
  }

  return {
    target: [target],
    config: {
      ...config,
      tools: {
        ...config.tools,
        rspack: {
          ...existing,
          target,
        } as NonNullable<NonNullable<RsbuildConfig['tools']>['rspack']>,
      },
    },
  };
}

function resolveLaunchExecPath(
  appRoot: string,
  electronConfig: ApplicationElectronConfig | undefined,
  projectElectron: ProjectElectron | undefined,
  roles: Array<readonly [Role, RoleConfig]>,
): string | undefined {
  const configured = electronConfig?.execPath;
  if (configured === undefined) {
    return projectElectron?.execPath;
  }

  const launchExecPath = isAbsolute(configured)
    ? configured
    : resolve(appRoot, configured);

  if (
    projectElectron !== undefined &&
    resolve(projectElectron.execPath) === resolve(launchExecPath)
  ) {
    return launchExecPath;
  }

  if (needsElectronPackage(roles)) {
    throw new RselectronError(
      'RSELECTRON_ELECTRON_EXEC_INCONSISTENT',
      'electron',
      'electron.execPath does not match the project-local Electron package executable.',
      'Provide explicit Role formats and compiler targets, or point execPath at the resolved project-local Electron binary.',
    );
  }

  return launchExecPath;
}

export function normalizeRuntime(options: {
  appRoot: string;
  config: {
    electron?: ApplicationElectronConfig;
    main?: RoleConfig;
    preload?: RoleConfig;
    renderer?: RoleConfig;
  };
}): RuntimeNormalization {
  const roles = (
    [
      ['main', options.config.main],
      ['preload', options.config.preload],
      ['renderer', options.config.renderer],
    ] as const
  ).flatMap(([role, config]) =>
    config === undefined ? [] : ([[role, config]] as const),
  );

  const needsPackage = needsElectronPackage(roles);
  const projectElectron = needsPackage
    ? resolveProjectElectron(options.appRoot)
    : undefined;

  let electron = projectElectron;
  if (!needsPackage && options.config.electron?.execPath !== undefined) {
    try {
      electron = resolveProjectElectron(options.appRoot);
    } catch {
      electron = undefined;
    }
  }

  const manifest = needsApplicationManifest(roles)
    ? readManifest(options.appRoot, options.config.electron?.packageJson)
    : roles.some(([role]) => role === 'main' || role === 'preload')
      ? readManifestIfPresent(
          options.appRoot,
          options.config.electron?.packageJson,
        )
      : {};
  const formats: RuntimeNormalization['formats'] = {};
  const targets: RuntimeNormalization['targets'] = {};
  const normalizedRoles: RuntimeNormalization['roles'] = {};
  const warnings: Diagnostic[] = [];
  const pendingWarnings: Diagnostic[] = [];

  for (const [role, config] of roles) {
    let next = applyConventionalDistPath(options.appRoot, role, config);

    if (role === 'main' || role === 'preload') {
      const format = deriveFormat(next, manifest, electron);
      formats[role] = format;
      next = applyFormat(role, next, format);
    }

    if (shouldDeriveElectronTarget(next, needsPackage)) {
      if (electron === undefined) {
        throw new RselectronError(
          'RSELECTRON_ELECTRON_NOT_FOUND',
          'electron',
          'Target derivation requires project-local Electron.',
          'Install electron in the application or set an explicit compiler target.',
        );
      }
      const applied = applyElectronTarget(role, next, electron.major);
      targets[role] = applied.target;
      next = applied.config;
    } else if (hasExplicitBrowserslist(next)) {
      targets[role] = next.output!.overrideBrowserslist;
    } else if (hasExplicitRspackTarget(next)) {
      const rspackTarget = (
        next.tools!.rspack as { target?: string | string[] }
      ).target;
      targets[role] = Array.isArray(rspackTarget)
        ? rspackTarget.map(String)
        : [String(rspackTarget)];
    }

    if (next.output?.target === undefined) {
      next = {
        ...next,
        output: {
          ...next.output,
          target: role === 'renderer' ? 'web' : 'node',
        },
      };
    }

    // BUILD-007: Main/Preload keep stable entry names and skip minify by default.
    // Entry filename policy (ADR 0009): default extension from format + package type.
    if (role === 'main' || role === 'preload') {
      const format = formats[role]!;
      const filenameApplied = applyEntryFilenamePolicy(
        role,
        next,
        format,
        manifest.type,
      );
      next = filenameApplied.config;
      if (filenameApplied.warning !== undefined) {
        warnings.push(filenameApplied.warning);
      }
      next = {
        ...next,
        output: {
          ...next.output,
          filenameHash: next.output?.filenameHash ?? false,
          minify: next.output?.minify ?? false,
        },
      };
    }

    if (role === 'renderer') {
      const risk = rendererNodeIntegrationRisk(next);
      if (risk !== undefined) {
        warnings.push(risk);
      }
      // rspack LazyCompilation has a design flaw that causes infinite rebuild
      // loops when combined with HMR: the `activeModules` Set is cleared by
      // the native plugin's `currentActiveModules()` callback at the start of
      // each rebuild, and the client-side `compiling` Set is cleared when HMR
      // applies hot-updates. After rebuild completes, neither side retains
      // "already activated" state, so the next `import()` of a proxy chunk is
      // treated as a new activation → invalidate → rebuild → HMR → loop.
      // This is an upstream rspack issue; default-disable for renderer until
      // it is fixed. Users may opt in via dev.lazyCompilation explicitly.
      if (next.dev?.lazyCompilation === undefined) {
        next = {
          ...next,
          dev: {
            ...next.dev,
            lazyCompilation: false,
          },
        };
      }
    }

    const externalized = applyExternalization(
      role,
      next,
      options.appRoot,
      pendingWarnings,
    );
    next = applyAssetHandling(role, externalized.config, options.appRoot);
    next = applyNativeAssetHandling(role, next, options.appRoot);
    next = applyWorkerHandling(role, next);
    next = applyEsmRequireShim(role, next, formats[role]);
    warnings.push(...externalized.warnings);

    normalizedRoles[role] = next;
  }

  return {
    electron,
    formats,
    launchExecPath: resolveLaunchExecPath(
      options.appRoot,
      options.config.electron,
      electron,
      roles,
    ),
    pendingWarnings,
    roles: normalizedRoles,
    targets,
    warnings,
  };
}

export function toRsbuildConfig(role: Role, config: RoleConfig): RsbuildConfig {
  const { electron: _electron, ...rsbuildConfig } = config;
  void _electron;
  void role;
  return rsbuildConfig;
}
