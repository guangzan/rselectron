import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from './build.ts';
import { loadRselectronConfig, resolveConfigExport } from './config.ts';
import {
  assertEntryMatchesMain,
  plannedMainEntry,
  resolveLaunchEntry,
} from './electron/entry.ts';
import { resolveProjectElectron } from './electron/resolve.ts';
import { normalizeRuntime } from './electron/runtime.ts';
import { RselectronError } from './errors.ts';
import type {
  BuildMode,
  BuildOptions,
  BuildResult,
  ConfigContext,
  ConfigLoader,
  RselectronConfigExport,
} from './types.ts';

export interface PreviewOptions {
  args?: string[];
  config?: RselectronConfigExport;
  configLoader?: ConfigLoader;
  configPath?: string;
  cwd?: string;
  envMode?: string;
  mode?: BuildMode;
  skipBuild?: boolean;
}

export interface PreviewResult {
  buildResult?: BuildResult;
  close: () => Promise<void>;
  electronProcess: ChildProcess;
}

export async function preview(
  options: PreviewOptions = {},
): Promise<PreviewResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const mode = options.mode ?? 'production';
  const context: ConfigContext = {
    command: 'preview',
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

  if (runtime.roles.main === undefined) {
    throw new RselectronError(
      'RSELECTRON_DEV_ROLE_REQUIRED',
      'main',
      'Preview requires a Main Role.',
      'Configure the main Role in rselectron.config.*',
    );
  }

  const launchExecPath =
    runtime.launchExecPath ?? resolveProjectElectron(cwd).execPath;
  const launchEntry = resolveLaunchEntry(
    cwd,
    config.electron?.entry,
    config.electron?.packageJson,
  );
  const planned = plannedMainEntry(cwd, runtime.roles.main);
  assertEntryMatchesMain(cwd, launchEntry, planned);

  let buildResult: BuildResult | undefined;
  if (options.skipBuild !== true) {
    const buildOptions: BuildOptions = {
      config,
      configLoader: options.configLoader,
      configPath: options.configPath,
      cwd,
      envMode: options.envMode,
      mode,
    };
    buildResult = await build(buildOptions);
  }

  if (!existsSync(launchEntry)) {
    await buildResult?.close();
    throw new RselectronError(
      'RSELECTRON_ELECTRON_ENTRY_MISSING',
      'electron',
      `Electron entry does not exist: ${launchEntry}`,
      'Run a production build first, or omit --skip-build.',
    );
  }

  const electronArgs = [
    ...(config.electron?.args ?? []),
    ...(options.args ?? []),
    launchEntry,
  ];

  let closed = false;
  let closePromise: Promise<void> | undefined;
  const electronRef: { process?: ChildProcess } = {};

  const close = (): Promise<void> => {
    closePromise ??= (async () => {
      if (closed) {
        return;
      }
      closed = true;
      const electronProcess = electronRef.process;
      if (
        electronProcess !== undefined &&
        electronProcess.exitCode === null &&
        !electronProcess.killed
      ) {
        electronProcess.kill();
        await new Promise<void>((resolveExit) => {
          electronProcess.once('exit', () => {
            resolveExit();
          });
        });
      }
      await buildResult?.close();
    })();
    return closePromise;
  };

  const electronProcess = spawn(launchExecPath, electronArgs, {
    cwd,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  electronRef.process = electronProcess;
  electronProcess.once('exit', () => {
    void close();
  });

  return {
    buildResult,
    close,
    electronProcess,
  };
}
