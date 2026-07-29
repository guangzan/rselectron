import { loadConfig } from '@rsbuild/core';
import type {
  BuildMode,
  ConfigContext,
  RselectronConfig,
  RselectronConfigExport,
  RselectronConfigFunction,
} from './types.ts';

const configFileNames = [
  'rselectron.config.ts',
  'rselectron.config.js',
  'rselectron.config.mts',
  'rselectron.config.mjs',
  'rselectron.config.cts',
  'rselectron.config.cjs',
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeConfigContext(value: unknown): ConfigContext {
  const context = asRecord(value);
  const meta = asRecord(context.meta);
  const mode = (context.mode ?? meta.mode ?? context.env) as
    BuildMode | undefined;

  return {
    command: (context.command ?? 'build') as ConfigContext['command'],
    envMode: String(context.envMode ?? mode ?? 'production'),
    mode: mode ?? 'production',
  };
}

export function defineConfig<T extends RselectronConfig>(
  config: T | Promise<T>,
): T | Promise<T>;
export function defineConfig(
  config: RselectronConfigFunction,
): RselectronConfigFunction;
export function defineConfig(
  config: RselectronConfigExport,
): RselectronConfigExport {
  if (typeof config !== 'function') {
    return config;
  }

  return (context) => config(normalizeConfigContext(context));
}

export async function resolveConfigExport(
  config: RselectronConfigExport,
  context: ConfigContext,
): Promise<RselectronConfig> {
  return typeof config === 'function' ? config(context) : config;
}

export interface LoadedRselectronConfig {
  content: RselectronConfig;
  dependencies: string[];
  filePath: string | null;
}

export async function loadRselectronConfig(options: {
  configLoader?: 'auto' | 'jiti' | 'native';
  configPath?: string;
  cwd: string;
  context: ConfigContext;
}): Promise<LoadedRselectronConfig> {
  const loaded = await loadConfig<RselectronConfig>({
    command: options.context.command,
    configFileNames,
    cwd: options.cwd,
    envMode: options.context.envMode,
    loader: options.configLoader,
    meta: {
      mode: options.context.mode,
    },
    path: options.configPath,
  });

  return {
    content: loaded.content,
    dependencies: loaded.dependencies,
    filePath: loaded.filePath,
  };
}

export function configWatchPaths(loaded: LoadedRselectronConfig): string[] {
  const paths = new Set<string>();
  if (loaded.filePath !== null) {
    paths.add(loaded.filePath);
  }
  for (const dependency of loaded.dependencies) {
    paths.add(dependency);
  }
  return [...paths];
}
