import {
  createRsbuild,
  type BuildResult as RsbuildBuildResult,
} from '@rsbuild/core';
import { resolve } from 'node:path';
import { loadRselectronConfig, resolveConfigExport } from './config.ts';
import {
  maybeEntryMismatchWarning,
  plannedMainEntry,
  resolveLaunchEntry,
} from './electron/entry.ts';
import { normalizeRuntime, toRsbuildConfig } from './electron/runtime.ts';
import { envPrefixesForRole } from './env.ts';
import { RselectronError } from './errors.ts';
import type {
  BuildOptions,
  BuildResult,
  ConfigContext,
  Diagnostic,
  Role,
} from './types.ts';

const roleNames: readonly Role[] = ['main', 'preload', 'renderer'];

interface StatsJson {
  assets?: Array<{
    name?: string;
  }>;
  children?: StatsJson[];
  outputPath?: string;
}

function collectOutputPaths(stats: RsbuildBuildResult['stats']): string[] {
  if (stats === undefined) {
    return [];
  }

  const root = stats.toJson({
    all: false,
    assets: true,
    outputPath: true,
  }) as StatsJson;
  const paths = new Set<string>();

  const visit = (json: StatsJson): void => {
    if (json.outputPath !== undefined) {
      for (const asset of json.assets ?? []) {
        if (asset.name !== undefined) {
          paths.add(resolve(json.outputPath, asset.name));
        }
      }
    }

    for (const child of json.children ?? []) {
      visit(child);
    }
  };

  visit(root);
  return [...paths].sort();
}

function createMissingRoleWarning(role: Role): Diagnostic {
  return {
    code: 'RSELECTRON_ROLE_MISSING',
    message: `No ${role} Role is configured; skipping it.`,
    role,
  };
}

export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  if (options.watch === true) {
    throw new RselectronError(
      'RSELECTRON_BUILD_WATCH_UNSUPPORTED',
      'orchestration',
      'The build operation is finite and does not support watch mode.',
      'Use the dev command when you need watched Role builds.',
    );
  }

  const cwd = resolve(options.cwd ?? process.cwd());
  const mode = options.mode ?? 'production';
  const context: ConfigContext = {
    command: 'build',
    envMode: options.envMode ?? mode,
    mode,
  };
  const config =
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
  const runtime = normalizeRuntime({
    appRoot: cwd,
    config,
  });
  const configuredRoles = roleNames.flatMap((role) => {
    const roleConfig = runtime.roles[role];
    return roleConfig === undefined ? [] : [[role, roleConfig] as const];
  });
  const warnings = [
    ...runtime.warnings,
    ...roleNames
      .filter((role) => config[role] === undefined)
      .map(createMissingRoleWarning),
  ];
  if (runtime.roles.main !== undefined) {
    try {
      const launchEntry = resolveLaunchEntry(
        cwd,
        config.electron?.entry,
        config.electron?.packageJson,
      );
      const planned = plannedMainEntry(cwd, runtime.roles.main);
      const mismatch = maybeEntryMismatchWarning(cwd, launchEntry, planned);
      if (mismatch !== undefined) {
        warnings.push(mismatch);
      }
    } catch {
      // Missing manifests are launch-time failures, not build warnings.
    }
  }
  const instances = await Promise.all(
    configuredRoles.map(async ([role, roleConfig]) => {
      try {
        return {
          instance: await createRsbuild({
            callerName: 'rselectron',
            config: toRsbuildConfig(role, roleConfig),
            cwd,
            loadEnv: {
              mode: context.envMode,
              prefixes: [...envPrefixesForRole(role)],
              processEnv: {},
            },
          }),
          role,
        };
      } catch (cause) {
        throw new RselectronError(
          'RSELECTRON_ROLE_CREATE_FAILED',
          role,
          cause,
          `Review the ${role} Role configuration.`,
        );
      }
    }),
  );
  const settledBuilds = await Promise.allSettled(
    instances.map(async ({ instance, role }) => {
      try {
        return {
          result: await instance.build(),
          role,
        };
      } catch (cause) {
        throw new RselectronError(
          'RSELECTRON_ROLE_BUILD_FAILED',
          role,
          cause,
          `Review the ${role} Rsbuild diagnostics above.`,
        );
      }
    }),
  );
  const failedBuild = settledBuilds.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  if (failedBuild !== undefined) {
    await Promise.allSettled(
      settledBuilds.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value.result.close()] : [],
      ),
    );
    throw failedBuild.reason;
  }

  const successfulBuilds = settledBuilds.map((result) => {
    if (result.status === 'rejected') {
      throw result.reason;
    }
    return result.value;
  });
  const roleResults: BuildResult['roles'] = {};

  for (const { result, role } of successfulBuilds) {
    roleResults[role] = {
      paths: collectOutputPaths(result.stats),
      stats: result.stats,
    };
  }

  warnings.push(...runtime.pendingWarnings);

  let closePromise: Promise<void> | undefined;

  return {
    close() {
      closePromise ??= Promise.all(
        successfulBuilds.map(({ result }) => result.close()),
      ).then(() => undefined);
      return closePromise;
    },
    roles: roleResults,
    runtime: {
      electron:
        runtime.electron === undefined
          ? undefined
          : {
              execPath: runtime.electron.execPath,
              major: runtime.electron.major,
              version: runtime.electron.version,
            },
      formats: runtime.formats,
      launchExecPath: runtime.launchExecPath,
      targets: runtime.targets,
    },
    warnings,
  };
}
