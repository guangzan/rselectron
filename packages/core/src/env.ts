import {
  loadEnv as loadRsbuildEnv,
  mergeRsbuildConfig,
  type LoadEnvOptions,
  type LoadEnvResult,
  type RsbuildConfig,
} from '@rsbuild/core';
import type { Role, RoleConfig, RselectronConfig } from './types.ts';

export { mergeRsbuildConfig };
export type { LoadEnvOptions, LoadEnvResult };

export const RSELECTRON_ENV_PREFIXES = [
  'RSELECTRON_',
  'MAIN_RSELECTRON_',
  'PRELOAD_RSELECTRON_',
  'RENDERER_RSELECTRON_',
] as const;

const roleEnvPrefixes: Record<Role, readonly string[]> = {
  main: ['RSELECTRON_', 'MAIN_RSELECTRON_'],
  preload: ['RSELECTRON_', 'PRELOAD_RSELECTRON_'],
  renderer: ['RSELECTRON_', 'RENDERER_RSELECTRON_'],
};

export function envPrefixesForRole(role: Role): readonly string[] {
  return roleEnvPrefixes[role];
}

export function loadEnv(options: LoadEnvOptions = {}): LoadEnvResult {
  return loadRsbuildEnv({
    ...options,
    prefixes: options.prefixes ?? [...RSELECTRON_ENV_PREFIXES],
  });
}

function mergeRoleConfig(
  left: RoleConfig | undefined,
  right: RoleConfig | undefined,
): RoleConfig | undefined {
  if (left === undefined) {
    return right;
  }
  if (right === undefined) {
    return left;
  }

  const { electron: leftElectron, ...leftRsbuild } = left;
  const { electron: rightElectron, ...rightRsbuild } = right;
  const merged = mergeRsbuildConfig(
    leftRsbuild as RsbuildConfig,
    rightRsbuild as RsbuildConfig,
  ) as RoleConfig;

  if (leftElectron !== undefined || rightElectron !== undefined) {
    merged.electron = {
      ...leftElectron,
      ...rightElectron,
    };
  }

  return merged;
}

export function mergeRselectronConfig(
  ...configs: Array<RselectronConfig | undefined>
): RselectronConfig {
  const merged: RselectronConfig = {};

  for (const config of configs) {
    if (config === undefined) {
      continue;
    }

    if (config.electron !== undefined) {
      merged.electron = {
        ...merged.electron,
        ...config.electron,
      };
    }

    for (const role of ['main', 'preload', 'renderer'] as const) {
      const next = mergeRoleConfig(merged[role], config[role]);
      if (next !== undefined) {
        merged[role] = next;
      }
    }
  }

  return merged;
}
