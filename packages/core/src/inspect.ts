import { createRsbuild } from '@rsbuild/core';
import { resolve } from 'node:path';
import { loadRselectronConfig, resolveConfigExport } from './config.ts';
import { normalizeRuntime, toRsbuildConfig } from './electron/runtime.ts';
import { envPrefixesForRole } from './env.ts';
import { RselectronError } from './errors.ts';
import type {
  BuildMode,
  ConfigContext,
  ConfigLoader,
  Diagnostic,
  Role,
  RoleConfig,
  RselectronConfigExport,
} from './types.ts';

const roleNames: readonly Role[] = ['main', 'preload', 'renderer'];

const SENSITIVE_NAME =
  /(?:secret|token|password|passwd|api[_-]?key|private[_-]?key|access[_-]?key|auth|credential)/i;

export interface InspectOptions {
  config?: RselectronConfigExport;
  configLoader?: ConfigLoader;
  configPath?: string;
  cwd?: string;
  envMode?: string;
  mode?: BuildMode;
}

export interface RoleInspectResult {
  normalized: RoleConfig;
  rsbuild: unknown;
  rspack: unknown[];
}

export interface InspectResult {
  format: (style: 'human' | 'json') => string;
  roles: Partial<Record<Role, RoleInspectResult>>;
  warnings: Diagnostic[];
}

function createMissingRoleWarning(role: Role): Diagnostic {
  return {
    code: 'RSELECTRON_ROLE_MISSING',
    message: `No ${role} Role is configured; skipping it.`,
    role,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function redactSensitive(value: unknown, key = ''): unknown {
  if (SENSITIVE_NAME.test(key)) {
    return '[REDACTED]';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitive(entry, key));
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    result[childKey] = redactSensitive(childValue, childKey);
  }
  return result;
}

function formatHuman(result: InspectResult): string {
  const lines: string[] = [];
  for (const role of roleNames) {
    const roleResult = result.roles[role];
    if (roleResult === undefined) {
      continue;
    }
    lines.push(`Role: ${role}`);
    lines.push('  normalized:');
    lines.push(
      JSON.stringify(roleResult.normalized, null, 2)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n'),
    );
    lines.push('  rsbuild:');
    lines.push(
      JSON.stringify(roleResult.rsbuild, null, 2)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n'),
    );
    lines.push('  rspack:');
    lines.push(
      JSON.stringify(roleResult.rspack, null, 2)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n'),
    );
    lines.push('');
  }
  for (const warning of result.warnings) {
    lines.push(`[${warning.code}] ${warning.message}`);
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

export async function inspect(
  options: InspectOptions = {},
): Promise<InspectResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const mode = options.mode ?? 'production';
  const context: ConfigContext = {
    command: 'inspect',
    envMode: options.envMode ?? mode,
    mode,
  };

  let config;
  try {
    config =
      options.config === undefined
        ? (
            await loadRselectronConfig({
              configLoader: options.configLoader,
              configPath: options.configPath,
              context,
              cwd,
            })
          ).content
        : await resolveConfigExport(options.config, context);
  } catch (cause) {
    throw new RselectronError(
      'RSELECTRON_CONFIG_LOAD_FAILED',
      'orchestration',
      cause,
      'Fix the configuration file or pass an explicit --config path.',
    );
  }

  const runtime = normalizeRuntime({
    appRoot: cwd,
    config,
  });
  const warnings = [
    ...runtime.warnings,
    ...roleNames
      .filter((role) => config[role] === undefined)
      .map(createMissingRoleWarning),
  ];

  const roles: InspectResult['roles'] = {};

  for (const role of roleNames) {
    const roleConfig = runtime.roles[role];
    if (roleConfig === undefined) {
      continue;
    }

    try {
      const instance = await createRsbuild({
        callerName: 'rselectron',
        config: toRsbuildConfig(role, roleConfig),
        cwd,
        loadEnv: {
          mode: context.envMode,
          prefixes: [...envPrefixesForRole(role)],
          processEnv: {},
        },
      });
      const inspected = await instance.inspectConfig({
        mode: mode === 'none' ? 'production' : mode,
        writeToDisk: false,
      });

      roles[role] = {
        normalized: redactSensitive(roleConfig) as RoleConfig,
        rsbuild: redactSensitive(inspected.origin.rsbuildConfig),
        rspack: redactSensitive(inspected.origin.bundlerConfigs) as unknown[],
      };
    } catch (cause) {
      if (cause instanceof RselectronError) {
        throw cause;
      }
      throw new RselectronError(
        'RSELECTRON_ROLE_CREATE_FAILED',
        role,
        cause,
        `Review the ${role} Role configuration.`,
      );
    }
  }

  const result: InspectResult = {
    format(style) {
      if (style === 'json') {
        return `${JSON.stringify(
          {
            roles: result.roles,
            warnings: result.warnings,
          },
          null,
          2,
        )}\n`;
      }
      return formatHuman(result);
    },
    roles,
    warnings,
  };

  return result;
}
