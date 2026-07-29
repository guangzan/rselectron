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

function mergeRspackExternals(
  existing: RsbuildConfig['tools'] extends { rspack?: infer R } | undefined
    ? R extends { externals?: infer E }
      ? E
      : unknown
    : unknown,
  predicate: (request: string) => boolean,
): NonNullable<
  NonNullable<NonNullable<RsbuildConfig['tools']>['rspack']> extends {
    externals?: infer E;
  }
    ? E
    : never
> {
  const externalFn = (
    { request }: { request?: string },
    callback: (error?: Error, result?: string | boolean) => void,
  ): void => {
    if (request !== undefined && predicate(request)) {
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
