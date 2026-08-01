import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RsbuildConfig } from '@rsbuild/core';
import type {
  Diagnostic,
  Role,
  RoleConfig,
  RoleElectronConfig,
} from '../types.ts';

export type ExternalizeDepsOption =
  | boolean
  | {
      exclude?: string[];
      include?: string[];
    };

interface ApplicationDependencies {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface PackageManifest {
  exports?: unknown;
  main?: string;
  module?: string;
  type?: string;
}

const alwaysExternal = new Set<string>([
  'electron',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

function readDependencyNames(appRoot: string): string[] {
  try {
    const manifest = JSON.parse(
      readFileSync(resolve(appRoot, 'package.json'), 'utf8'),
    ) as ApplicationDependencies;
    return [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
    ];
  } catch {
    return [];
  }
}

function normalizeExternalizeDeps(
  role: Role,
  electron: RoleElectronConfig | undefined,
): {
  enabled: boolean;
  exclude: string[];
  include: string[];
  explicit: boolean;
} {
  const option = electron?.externalizeDeps;
  const isolated = electron?.isolatedEntries === true;
  const explicit = option !== undefined;

  if (option === false) {
    return { enabled: false, exclude: [], include: [], explicit };
  }

  if (option === undefined) {
    // Preload isolation defaults dependency externalization off.
    if (role === 'preload' && isolated) {
      return { enabled: false, exclude: [], include: [], explicit: false };
    }
    return {
      enabled: role === 'main' || role === 'preload',
      exclude: [],
      include: [],
      explicit: false,
    };
  }

  if (option === true) {
    return { enabled: true, exclude: [], include: [], explicit };
  }

  return {
    enabled: true,
    exclude: option.exclude ?? [],
    include: option.include ?? [],
    explicit,
  };
}

function matchesPackage(request: string, name: string): boolean {
  return request === name || request.startsWith(`${name}/`);
}

function shouldExternalizeRequest(
  request: string,
  dependencyNames: string[],
  policy: ReturnType<typeof normalizeExternalizeDeps>,
): boolean {
  if (alwaysExternal.has(request) || request.startsWith('electron/')) {
    return true;
  }

  if (policy.include.some((name) => matchesPackage(request, name))) {
    return false;
  }

  if (policy.exclude.some((name) => matchesPackage(request, name))) {
    return true;
  }

  if (!policy.enabled) {
    return false;
  }

  return dependencyNames.some((name) => matchesPackage(request, name));
}

function isAlwaysExternalRequest(request: string): boolean {
  return alwaysExternal.has(request) || request.startsWith('electron/');
}

function parsePackageRequest(
  request: string,
): { name: string; subpath: string } | undefined {
  if (isAlwaysExternalRequest(request) || request.startsWith('node:')) {
    return undefined;
  }

  if (request.startsWith('@')) {
    const parts = request.split('/');
    if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined) {
      return undefined;
    }
    const name = `${parts[0]}/${parts[1]}`;
    const rest = parts.slice(2).join('/');
    return { name, subpath: rest === '' ? '.' : `./${rest}` };
  }

  const slash = request.indexOf('/');
  if (slash === -1) {
    return { name: request, subpath: '.' };
  }
  return {
    name: request.slice(0, slash),
    subpath: `./${request.slice(slash + 1)}`,
  };
}

function readPackageManifest(
  appRoot: string,
  name: string,
): PackageManifest | undefined {
  try {
    return JSON.parse(
      readFileSync(
        resolve(appRoot, 'node_modules', name, 'package.json'),
        'utf8',
      ),
    ) as PackageManifest;
  } catch {
    return undefined;
  }
}

function resolveExportTarget(exportsField: unknown, subpath: string): unknown {
  if (exportsField == null) {
    return undefined;
  }

  if (typeof exportsField === 'string' || Array.isArray(exportsField)) {
    return subpath === '.' ? exportsField : undefined;
  }

  if (typeof exportsField !== 'object') {
    return undefined;
  }

  const map = exportsField as Record<string, unknown>;
  if (subpath in map) {
    return map[subpath];
  }
  if (
    subpath === '.' &&
    ('import' in map || 'require' in map || 'default' in map)
  ) {
    return map;
  }
  return undefined;
}

function conditionsAreImportOnly(target: unknown): boolean {
  if (target == null || typeof target === 'string' || Array.isArray(target)) {
    return false;
  }
  if (typeof target !== 'object') {
    return false;
  }

  const conditions = target as Record<string, unknown>;
  if ('require' in conditions || 'default' in conditions) {
    return false;
  }
  if ('import' in conditions) {
    return true;
  }

  for (const value of Object.values(conditions)) {
    if (conditionsAreImportOnly(value)) {
      return true;
    }
  }
  return false;
}

/**
 * Pragmatic heuristic: CJS CommonJS-externalizing this request is likely to
 * fail at runtime because the package offers no usable require/default path.
 */
export function isImportOnlyExternal(
  request: string,
  appRoot: string,
): boolean {
  const parsed = parsePackageRequest(request);
  if (parsed === undefined) {
    return false;
  }

  const pkg = readPackageManifest(appRoot, parsed.name);
  if (pkg === undefined) {
    return false;
  }

  if (pkg.exports !== undefined) {
    const target = resolveExportTarget(pkg.exports, parsed.subpath);
    if (target === undefined) {
      return false;
    }
    if (conditionsAreImportOnly(target)) {
      return true;
    }
    if (
      typeof target === 'object' &&
      target !== null &&
      !Array.isArray(target)
    ) {
      const conditions = target as Record<string, unknown>;
      if ('require' in conditions || 'default' in conditions) {
        return false;
      }
    }
    return pkg.type === 'module';
  }

  if (pkg.type === 'module') {
    return true;
  }
  return pkg.module !== undefined && pkg.main === undefined;
}

function importOnlyExternalWarning(role: Role, request: string): Diagnostic {
  return {
    code: 'RSELECTRON_IMPORT_ONLY_EXTERNAL',
    role,
    message: `CJS ${role} CommonJS-externalized "${request}", but that request looks import-only (no usable require/default export). Prefer format: 'esm' (or format: 'auto' under "type": "module") and remove a forced format: 'cjs' if it was only a workaround; if you intentionally stay on CJS, bundle with electron.externalizeDeps.include.`,
  };
}

interface CjsImportOnlyCollector {
  appRoot: string;
  pendingWarnings: Diagnostic[];
  role: Role;
  seen: Set<string>;
}

function mergeRspackExternals(
  existing: RsbuildConfig['tools'] extends { rspack?: infer R } | undefined
    ? R extends { externals?: infer E }
      ? E
      : unknown
    : unknown,
  predicate: (request: string) => boolean,
  format: 'cjs' | 'esm',
  collector?: CjsImportOnlyCollector,
): NonNullable<
  NonNullable<NonNullable<RsbuildConfig['tools']>['rspack']> extends {
    externals?: infer E;
  }
    ? E
    : never
> {
  const externalFn = (
    { request, dependencyType }: { request?: string; dependencyType?: string },
    callback: (
      error?: Error | null,
      result?: string | boolean,
      type?: string,
    ) => void,
  ): void => {
    if (request !== undefined && predicate(request)) {
      if (format === 'esm') {
        // require()-originated: node-commonjs → createRequire under ESM.
        // import-originated: mark external and let module-import apply.
        if (dependencyType === 'commonjs') {
          callback(undefined, `node-commonjs ${request}`);
        } else {
          callback(undefined, true);
        }
        return;
      }
      if (
        collector !== undefined &&
        !isAlwaysExternalRequest(request) &&
        isImportOnlyExternal(request, collector.appRoot) &&
        !collector.seen.has(request)
      ) {
        collector.seen.add(request);
        collector.pendingWarnings.push(
          importOnlyExternalWarning(collector.role, request),
        );
      }
      callback(undefined, `commonjs ${request}`);
      return;
    }
    callback();
  };

  if (existing === undefined) {
    return externalFn as never;
  }

  if (Array.isArray(existing)) {
    return [...existing, externalFn] as never;
  }

  return [existing, externalFn] as never;
}

export function applyExternalization(
  role: Role,
  config: RoleConfig,
  appRoot: string,
  pendingWarnings: Diagnostic[] = [],
): { config: RoleConfig; warnings: Diagnostic[] } {
  if (role === 'renderer' && config.electron?.isolatedEntries !== true) {
    return { config, warnings: [] };
  }

  const warnings: Diagnostic[] = [];
  const electron = config.electron;
  const policy = normalizeExternalizeDeps(role, electron);
  const dependencyNames = readDependencyNames(appRoot);

  if (
    role === 'preload' &&
    electron?.isolatedEntries === true &&
    policy.explicit &&
    policy.enabled
  ) {
    warnings.push({
      code: 'RSELECTRON_PRELOAD_ISOLATION_EXTERNALIZE_CONFLICT',
      message:
        'Preload isolatedEntries is enabled with externalizeDeps enabled; the explicit externalizeDeps choice is retained.',
      role: 'preload',
    });
  }

  let next = config;
  const existingRspack =
    typeof next.tools?.rspack === 'object' &&
    next.tools.rspack !== null &&
    !Array.isArray(next.tools.rspack) &&
    typeof next.tools.rspack !== 'function'
      ? next.tools.rspack
      : undefined;

  if (role === 'main' || role === 'preload') {
    const format = next.output?.module === true ? 'esm' : 'cjs';
    const collector: CjsImportOnlyCollector | undefined =
      format === 'cjs'
        ? {
            appRoot,
            pendingWarnings,
            role,
            seen: new Set<string>(),
          }
        : undefined;
    next = {
      ...next,
      tools: {
        ...next.tools,
        rspack: {
          ...existingRspack,
          externals: mergeRspackExternals(
            existingRspack?.externals,
            (request) =>
              shouldExternalizeRequest(request, dependencyNames, policy),
            format,
            collector,
          ),
        } as NonNullable<NonNullable<RsbuildConfig['tools']>['rspack']>,
      },
    };
  }

  if (electron?.isolatedEntries === true) {
    const rspack =
      typeof next.tools?.rspack === 'object' &&
      next.tools.rspack !== null &&
      !Array.isArray(next.tools.rspack)
        ? next.tools.rspack
        : {};
    next = {
      ...next,
      tools: {
        ...next.tools,
        rspack: {
          ...rspack,
          optimization: {
            ...(typeof rspack === 'object' &&
            rspack !== null &&
            'optimization' in rspack &&
            typeof rspack.optimization === 'object' &&
            rspack.optimization !== null
              ? rspack.optimization
              : {}),
            runtimeChunk: false,
            splitChunks: false,
          },
        } as NonNullable<NonNullable<RsbuildConfig['tools']>['rspack']>,
      },
    };
  }

  return { config: next, warnings };
}
