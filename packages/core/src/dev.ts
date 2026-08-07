import {
  createRsbuild,
  type RsbuildDevServer,
  type RsbuildInstance,
} from '@rsbuild/core';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, watch, type FSWatcher } from 'node:fs';
import { resolve } from 'node:path';
import {
  configWatchPaths,
  loadRselectronConfig,
  resolveConfigExport,
  type LoadedRselectronConfig,
} from './config.ts';
import {
  assertEntryMatchesMain,
  plannedMainEntry,
  resolveLaunchEntry,
} from './electron/entry.ts';
import { stopElectronProcess } from './electron/process.ts';
import { resolveProjectElectron } from './electron/resolve.ts';
import { normalizeRuntime, toRsbuildConfig } from './electron/runtime.ts';
import { envPrefixesForRole } from './env.ts';
import { RselectronError } from './errors.ts';
import {
  createCandidateSnapshot,
  ensureStagingDirectory,
  isStagingEmpty,
  promoteGeneration,
  resolveGenerationLayout,
  roleDistRoot,
  withStagingOutput,
  type GenerationLayout,
} from './generation.ts';
import type {
  BuildMode,
  ConfigContext,
  ConfigLoader,
  Diagnostic,
  Role,
  RselectronConfig,
  RselectronConfigExport,
} from './types.ts';
import {
  MAIN_RESTART_DEBOUNCE_MS,
  resolveWatchedRoles,
  type NodeWatchRole,
  type WatchSelection,
} from './watch.ts';

export type { WatchSelection };

const roleNames: readonly Role[] = ['main', 'preload', 'renderer'];
const CONFIG_RESTART_DEBOUNCE_MS = 100;

export interface CreateServerOptions {
  config?: RselectronConfigExport;
  configLoader?: ConfigLoader;
  configPath?: string;
  cwd?: string;
  envMode?: string;
  mode?: BuildMode;
  rendererOnly?: boolean;
  watch?: WatchSelection;
}

export interface CreateServerResult {
  close: () => Promise<void>;
  electronProcess: ChildProcess;
  urls: string[];
  warnings: Diagnostic[];
}

function statsHasErrors(
  stats: {
    hasErrors?: () => boolean;
  } | null,
): boolean {
  return stats?.hasErrors?.() === true;
}

function watchConfigDependencies(
  paths: string[],
  onChange: (filePath: string) => void,
): () => Promise<void> {
  const watchers: FSWatcher[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  for (const filePath of paths) {
    if (!existsSync(filePath)) {
      continue;
    }
    try {
      const watcher = watch(filePath, () => {
        if (closed) {
          return;
        }
        if (debounceTimer !== undefined) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          debounceTimer = undefined;
          if (!closed) {
            onChange(filePath);
          }
        }, CONFIG_RESTART_DEBOUNCE_MS);
      });
      watchers.push(watcher);
    } catch {
      // Skip files the host cannot watch; remaining dependencies stay active.
    }
  }

  return async () => {
    closed = true;
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}

interface StartDevGenerationOptions {
  config: RselectronConfig;
  cwd: string;
  context: ConfigContext;
  onElectronExitClose?: () => void;
  rendererOnly?: boolean;
  watch?: WatchSelection;
}

async function startDevGeneration(
  options: StartDevGenerationOptions,
): Promise<CreateServerResult> {
  const { config, context, cwd } = options;
  const runtime = normalizeRuntime({
    appRoot: cwd,
    config,
  });

  const launchExecPath =
    runtime.launchExecPath ?? resolveProjectElectron(cwd).execPath;
  const watchedRoles = resolveWatchedRoles(options.watch, config);
  if (options.rendererOnly === true && watchedRoles.size > 0) {
    throw new RselectronError(
      'RSELECTRON_RENDERER_ONLY_WATCH_CONFLICT',
      'orchestration',
      'Renderer-only mode cannot enable Main or Preload watch.',
      'Omit --watch when using --renderer-only.',
    );
  }

  const configuredRoles = roleNames.flatMap((role) => {
    const roleConfig = runtime.roles[role];
    return roleConfig === undefined ? [] : [[role, roleConfig] as const];
  });

  if (runtime.roles.renderer === undefined) {
    throw new RselectronError(
      'RSELECTRON_DEV_ROLE_REQUIRED',
      'renderer',
      'Development sessions require a Renderer Role.',
      'Configure the renderer Role in rselectron.config.*',
    );
  }

  if (runtime.roles.main === undefined) {
    throw new RselectronError(
      'RSELECTRON_DEV_ROLE_REQUIRED',
      'main',
      'Development sessions require a Main Role.',
      'Configure the main Role in rselectron.config.*',
    );
  }

  const launchEntry = resolveLaunchEntry(
    cwd,
    config.electron?.entry,
    config.electron?.packageJson,
  );
  const planned = plannedMainEntry(cwd, runtime.roles.main);
  assertEntryMatchesMain(cwd, launchEntry, planned);

  const instances = new Map<Role, RsbuildInstance>();
  const closers: Array<() => Promise<void>> = [];
  let rendererServer: RsbuildDevServer | undefined;
  let rendererUrl: string | undefined;
  let closed = false;
  let closePromise: Promise<void> | undefined;
  const electronRef: { process?: ChildProcess } = {};
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let launched = false;

  const close = (): Promise<void> => {
    closePromise ??= (async () => {
      if (closed) {
        return;
      }
      closed = true;
      if (restartTimer !== undefined) {
        clearTimeout(restartTimer);
        restartTimer = undefined;
      }
      const electronProcess = electronRef.process;
      if (electronProcess !== undefined) {
        await stopElectronProcess(electronProcess);
      }
      await Promise.allSettled(closers.map((closeResource) => closeResource()));
    })();
    return closePromise;
  };

  const spawnElectron = (): ChildProcess => {
    if (rendererUrl === undefined) {
      throw new RselectronError(
        'RSELECTRON_RENDERER_URL_MISSING',
        'renderer',
        'Renderer development server did not report a listening URL.',
        'Check Renderer server.host and server.port configuration.',
      );
    }
    if (!existsSync(launchEntry)) {
      throw new RselectronError(
        'RSELECTRON_ELECTRON_ENTRY_MISSING',
        'electron',
        `Electron entry does not exist: ${launchEntry}`,
        'Build Main output before launching, or fix package.json#main.',
      );
    }

    const electronProcess = spawn(launchExecPath, [launchEntry], {
      cwd,
      env: {
        ...process.env,
        RSELECTRON_RENDERER_URL: rendererUrl,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    electronRef.process = electronProcess;
    electronProcess.once('exit', () => {
      if (!closed && launched) {
        void close().then(() => {
          options.onElectronExitClose?.();
        });
      }
    });
    return electronProcess;
  };

  const restartElectron = (): void => {
    const previous = electronRef.process;
    if (
      previous !== undefined &&
      previous.exitCode === null &&
      !previous.killed
    ) {
      previous.removeAllListeners('exit');
      previous.kill();
    }
    spawnElectron();
  };

  const stopElectronForPromotion = async (): Promise<void> => {
    const previous = electronRef.process;
    if (previous === undefined) {
      return;
    }
    previous.removeAllListeners('exit');
    await stopElectronProcess(previous);
    electronRef.process = undefined;
  };

  const scheduleMainRestart = (): void => {
    if (restartTimer !== undefined) {
      clearTimeout(restartTimer);
    }
    restartTimer = setTimeout(() => {
      restartTimer = undefined;
      if (!closed && launched) {
        restartElectron();
      }
    }, MAIN_RESTART_DEBOUNCE_MS);
  };

  const notifyPreloadReload = (): void => {
    if (rendererServer === undefined || closed || !launched) {
      return;
    }
    rendererServer.sockWrite('full-reload');
  };

  try {
    const rolesToCreate =
      options.rendererOnly === true
        ? configuredRoles.filter(([role]) => role === 'renderer')
        : configuredRoles;

    const generationLayouts = new Map<NodeWatchRole, GenerationLayout>();

    for (const [role, roleConfig] of rolesToCreate) {
      let configForInstance = roleConfig;
      if ((role === 'main' || role === 'preload') && watchedRoles.has(role)) {
        const active = roleDistRoot(cwd, roleConfig);
        const layout = resolveGenerationLayout(active);
        ensureStagingDirectory(layout);
        generationLayouts.set(role, layout);
        configForInstance = withStagingOutput(roleConfig, layout);
      }

      const instance = await createRsbuild({
        callerName: 'rselectron',
        config: {
          ...toRsbuildConfig(role, configForInstance),
          mode: context.mode,
        },
        cwd,
        loadEnv: {
          mode: context.envMode,
          prefixes: [...envPrefixesForRole(role)],
          processEnv: {},
        },
      });
      instances.set(role, instance);
    }

    const requiredNodeRoles = (['main', 'preload'] as const).filter(
      (role) => runtime.roles[role] !== undefined,
    );

    if (options.rendererOnly === true) {
      for (const role of requiredNodeRoles) {
        const roleConfig = runtime.roles[role]!;
        const plannedPath =
          role === 'main'
            ? plannedMainEntry(cwd, roleConfig)
            : plannedMainEntry(cwd, roleConfig);
        const requiredPath =
          role === 'main' ? launchEntry : (plannedPath ?? undefined);
        const checkPath = plannedPath ?? requiredPath;
        if (checkPath === undefined || !existsSync(checkPath)) {
          throw new RselectronError(
            'RSELECTRON_RENDERER_ONLY_OUTPUT_MISSING',
            role,
            `Renderer-only mode requires existing ${role} output at ${checkPath ?? '(unknown)'}.`,
            'Run a full Development or production build before using --renderer-only.',
          );
        }
      }
      if (!existsSync(launchEntry)) {
        throw new RselectronError(
          'RSELECTRON_RENDERER_ONLY_OUTPUT_MISSING',
          'main',
          `Renderer-only mode requires existing Main launch entry at ${launchEntry}.`,
          'Run a full Development or production build before using --renderer-only.',
        );
      }
    } else {
      const firstSuccess = new Set<NodeWatchRole>();

      const promoteWatchedRole = async (role: NodeWatchRole): Promise<void> => {
        const layout = generationLayouts.get(role);
        if (layout === undefined) {
          return;
        }
        if (isStagingEmpty(layout)) {
          throw new RselectronError(
            'RSELECTRON_GENERATION_PROMOTE_FAILED',
            role,
            `Watched ${role} compile produced an empty staging generation.`,
            'The active generation was left unchanged.',
          );
        }
        const candidate = createCandidateSnapshot(layout);
        ensureStagingDirectory(layout);
        await promoteGeneration({
          active: layout.active,
          candidate,
          role,
          beforePromote:
            role === 'main' && launched
              ? () => stopElectronForPromotion()
              : undefined,
        });
      };

      const waitForFirstSuccess = (
        role: NodeWatchRole,
        instance: RsbuildInstance,
        watch: boolean,
      ): Promise<void> =>
        new Promise((resolveFirst, rejectFirst) => {
          let settled = false;
          const promoteQueue: { current: Promise<void> } = {
            current: Promise.resolve(),
          };

          instance.onAfterBuild(({ isFirstCompile, stats }) => {
            const failed = statsHasErrors(stats ?? null);
            if (failed) {
              if (!watch && isFirstCompile && !settled) {
                settled = true;
                rejectFirst(
                  new RselectronError(
                    'RSELECTRON_ROLE_BUILD_FAILED',
                    role,
                    'Role build failed.',
                    `Review the ${role} Rsbuild diagnostics above.`,
                  ),
                );
              }
              // Failed watched rebuilds leave the active LKG untouched.
              return;
            }

            promoteQueue.current = promoteQueue.current
              .then(async () => {
                if (watch) {
                  await promoteWatchedRole(role);
                }

                if (isFirstCompile) {
                  firstSuccess.add(role);
                  if (!settled) {
                    settled = true;
                    resolveFirst();
                  }
                  return;
                }

                if (role === 'main') {
                  scheduleMainRestart();
                } else {
                  notifyPreloadReload();
                }
              })
              .catch((cause) => {
                if (isFirstCompile && !settled) {
                  settled = true;
                  rejectFirst(
                    cause instanceof RselectronError
                      ? cause
                      : new RselectronError(
                          'RSELECTRON_GENERATION_PROMOTE_FAILED',
                          role,
                          cause,
                        ),
                  );
                }
                // Rebuild promotion failures preserve LKG and skip restart/reload.
              });
          });

          void instance
            .build(watch ? { watch: true } : undefined)
            .then((result) => {
              closers.push(async () => {
                await result.close();
              });
            })
            .catch((cause) => {
              if (!settled) {
                settled = true;
                rejectFirst(
                  new RselectronError(
                    'RSELECTRON_ROLE_BUILD_FAILED',
                    role,
                    cause,
                    `Review the ${role} Rsbuild diagnostics above.`,
                  ),
                );
              }
            });
        });

      await Promise.all(
        requiredNodeRoles.map(async (role) => {
          const instance = instances.get(role)!;
          const watch = watchedRoles.has(role);
          await waitForFirstSuccess(role, instance, watch);
        }),
      );
    }

    const renderer = instances.get('renderer')!;
    rendererServer = await renderer.createDevServer();
    const listening = await rendererServer.listen();
    closers.push(async () => {
      await rendererServer?.close();
    });

    const urls = listening.urls;
    rendererUrl = urls[0];
    if (rendererUrl === undefined) {
      throw new RselectronError(
        'RSELECTRON_RENDERER_URL_MISSING',
        'renderer',
        'Renderer development server did not report a listening URL.',
        'Check Renderer server.host and server.port configuration.',
      );
    }

    launched = true;
    spawnElectron();

    return {
      close,
      get electronProcess() {
        const process = electronRef.process;
        if (process === undefined) {
          throw new RselectronError(
            'RSELECTRON_ELECTRON_ENTRY_MISSING',
            'electron',
            'Electron process is not available.',
          );
        }
        return process;
      },
      urls,
      warnings: runtime.warnings,
    };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function createServer(
  options: CreateServerOptions = {},
): Promise<CreateServerResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const mode = options.mode ?? 'development';
  const context: ConfigContext = {
    command: 'dev',
    envMode: options.envMode ?? mode,
    mode,
  };

  // Rsbuild's build() (used for main/preload) sets NODE_ENV='production' via
  // `process.env.NODE_ENV || setNodeEnv('production')`. If NODE_ENV is unset
  // when build() runs, it becomes 'production', which then prevents
  // ReactRefreshRspackPlugin from injecting its preamble for the renderer
  // dev server (created later via createDevServer). Force NODE_ENV to match
  // the dev mode before any Rsbuild instance is created.
  if (mode === 'development') {
    process.env.NODE_ENV = 'development';
  }

  if (options.config !== undefined) {
    const config = await resolveConfigExport(options.config, context);
    return startDevGeneration({
      config,
      context,
      cwd,
      rendererOnly: options.rendererOnly,
      watch: options.watch,
    });
  }

  let closed = false;
  let closePromise: Promise<void> | undefined;
  let generation: CreateServerResult | undefined;
  let stopWatching: (() => Promise<void>) | undefined;
  let generationEpoch = 0;
  let restarting = false;
  let pendingRestart = false;

  const bindWatchers = async (paths: string[]): Promise<void> => {
    await stopWatching?.();
    stopWatching = undefined;
    if (paths.length === 0 || closed) {
      return;
    }
    stopWatching = watchConfigDependencies(paths, () => {
      void replaceGeneration();
    });
  };

  const startFromLoaded = async (
    loaded: LoadedRselectronConfig,
  ): Promise<CreateServerResult> => {
    const epoch = generationEpoch;
    return startDevGeneration({
      config: loaded.content,
      context,
      cwd,
      onElectronExitClose: () => {
        if (epoch === generationEpoch && !closed) {
          void closeSession();
        }
      },
      rendererOnly: options.rendererOnly,
      watch: options.watch,
    });
  };

  const loadConfigOnce = (): Promise<LoadedRselectronConfig> =>
    loadRselectronConfig({
      configLoader: options.configLoader,
      configPath: options.configPath,
      context,
      cwd,
    });

  const replaceGeneration = async (): Promise<void> => {
    if (closed) {
      return;
    }
    if (restarting) {
      pendingRestart = true;
      return;
    }

    restarting = true;
    try {
      do {
        pendingRestart = false;
        generationEpoch += 1;
        if (generation !== undefined) {
          await generation.close();
          generation = undefined;
        }

        try {
          const loaded = await loadConfigOnce();
          await bindWatchers(configWatchPaths(loaded));
          generation = await startFromLoaded(loaded);
        } catch {
          // Old generation is already closed. Keep watching so a later
          // configuration change can recover without leaking resources.
        }
      } while (pendingRestart && !closed);
    } finally {
      restarting = false;
    }
  };

  const closeSession = (): Promise<void> => {
    closePromise ??= (async () => {
      if (closed) {
        return;
      }
      closed = true;
      generationEpoch += 1;
      await stopWatching?.();
      stopWatching = undefined;
      if (generation !== undefined) {
        await generation.close();
        generation = undefined;
      }
    })();
    return closePromise;
  };

  const loaded = await loadConfigOnce();
  generation = await startFromLoaded(loaded);
  await bindWatchers(configWatchPaths(loaded));

  return {
    close: closeSession,
    get electronProcess() {
      if (generation === undefined) {
        throw new RselectronError(
          'RSELECTRON_ELECTRON_ENTRY_MISSING',
          'electron',
          'Electron process is not available.',
        );
      }
      return generation.electronProcess;
    },
    get urls() {
      return generation?.urls ?? [];
    },
    get warnings() {
      return generation?.warnings ?? [];
    },
  };
}
