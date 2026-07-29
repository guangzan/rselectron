import {
  build,
  createServer,
  getVersion,
  inspect,
  preview,
  RselectronError,
  type BuildOptions,
  type CreateServerOptions,
  type InspectOptions,
  type PreviewOptions,
  type WatchSelection,
} from '../../core/src/index.ts';
import { parseWatchSelection } from '../../core/src/watch.ts';

type BuildMode = NonNullable<BuildOptions['mode']>;
type ConfigLoader = NonNullable<BuildOptions['configLoader']>;

const help = `Usage: rselectron <command> [options]

Commands:
  build              Build configured Electron Roles
  dev                Start a Development session
  inspect            Print normalized Role configurations
  preview            Build (unless --skip-build) and launch Electron

Options:
  --config <path>            Use an explicit configuration file
  --config-loader <loader>   Select auto, jiti, or native
  --env-mode <name>          Select environment files
  --format <format>          inspect output: json (default) or human
  -h, --help       Show help
  --mode <mode>              Select development, production, or none
  --skip-build               preview without compiling
  --renderer-only            Reuse Main/Preload output (dev)
  --watch[=main|preload]     Opt Main/Preload into rebuild (dev)
  -v, --version    Show version
`;

export interface CliIO {
  stderr: (message: string) => void;
  stdout: (message: string) => void;
}

const processIO: CliIO = {
  stderr: (message) => {
    process.stderr.write(message);
  },
  stdout: (message) => {
    process.stdout.write(message);
  },
};

function readOption(
  args: string[],
  index: number,
): { nextIndex: number; value: string } {
  const argument = args[index]!;
  const equalsIndex = argument.indexOf('=');

  if (equalsIndex !== -1) {
    return {
      nextIndex: index,
      value: argument.slice(equalsIndex + 1),
    };
  }

  const value = args[index + 1];
  if (value === undefined || value.startsWith('-')) {
    throw new RselectronError(
      'RSELECTRON_CLI_OPTION_VALUE_MISSING',
      'orchestration',
      `${argument} requires a value.`,
    );
  }

  return {
    nextIndex: index + 1,
    value,
  };
}

function parseSharedOptions(args: string[]): {
  format: 'human' | 'json';
  options: Omit<
    CreateServerOptions & BuildOptions & InspectOptions & PreviewOptions,
    'watch'
  > & {
    watch?: WatchSelection | boolean;
  };
} {
  const options: Omit<
    CreateServerOptions & BuildOptions & InspectOptions & PreviewOptions,
    'watch'
  > & {
    watch?: WatchSelection | boolean;
  } = {};
  let format: 'human' | 'json' = 'json';

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;

    if (argument === '--watch' || argument.startsWith('--watch=')) {
      const value =
        argument === '--watch' ? 'true' : argument.slice('--watch='.length);
      options.watch = parseWatchSelection(value);
      continue;
    }

    if (argument === '--skip-build') {
      options.skipBuild = true;
      continue;
    }

    if (argument === '--renderer-only') {
      options.rendererOnly = true;
      continue;
    }

    const [name] = argument.split('=', 1);
    if (
      name === '--config' ||
      name === '--config-loader' ||
      name === '--env-mode' ||
      name === '--mode' ||
      name === '--format'
    ) {
      const option = readOption(args, index);
      index = option.nextIndex;

      if (name === '--config') {
        options.configPath = option.value;
      } else if (name === '--config-loader') {
        options.configLoader = option.value as ConfigLoader;
      } else if (name === '--env-mode') {
        options.envMode = option.value;
      } else if (name === '--format') {
        if (option.value !== 'human' && option.value !== 'json') {
          throw new RselectronError(
            'RSELECTRON_CLI_OPTION_VALUE_MISSING',
            'orchestration',
            `--format must be json or human (received ${option.value}).`,
          );
        }
        format = option.value;
      } else {
        options.mode = option.value as BuildMode;
      }
      continue;
    }

    throw new RselectronError(
      'RSELECTRON_CLI_OPTION_UNKNOWN',
      'orchestration',
      `Unknown option: ${argument}`,
    );
  }

  return { format, options };
}

function parseBuildOptions(args: string[]): BuildOptions {
  const options = parseSharedOptions(args).options;
  if (options.watch !== undefined && options.watch !== true) {
    throw new RselectronError(
      'RSELECTRON_BUILD_WATCH_UNSUPPORTED',
      'orchestration',
      'The build operation is finite and does not support Role-selective watch.',
      'Use the dev command when you need watched Role builds.',
    );
  }
  const { watch, ...rest } = options;
  return {
    ...rest,
    ...(watch === true ? { watch: true } : {}),
  };
}

function parseDevOptions(args: string[]): CreateServerOptions {
  return parseSharedOptions(args).options;
}

function parseInspectOptions(args: string[]): {
  format: 'human' | 'json';
  options: InspectOptions;
} {
  const parsed = parseSharedOptions(args);
  const { watch: _watch, ...options } = parsed.options;
  void _watch;
  return {
    format: parsed.format,
    options,
  };
}

function formatError(error: unknown): string {
  if (error instanceof RselectronError) {
    const hint = error.hint === undefined ? '' : `\nHint: ${error.hint}`;
    return `[${error.code}] ${error.message}${hint}\n`;
  }

  return `${error instanceof Error ? error.message : String(error)}\n`;
}

export async function runCli(
  args: string[],
  io: CliIO = processIO,
): Promise<number> {
  const [command, ...commandArgs] = args;

  if (command === '--help' || command === '-h') {
    io.stdout(help);
    return 0;
  }

  if (command === '--version' || command === '-v') {
    io.stdout(`${getVersion()}\n`);
    return 0;
  }

  if (command === undefined) {
    io.stderr(`No command specified.\n\n${help}`);
    return 1;
  }

  if (command === 'build') {
    try {
      const result = await build(parseBuildOptions(commandArgs));
      try {
        for (const warning of result.warnings) {
          io.stderr(`[${warning.code}] ${warning.message}\n`);
        }
        for (const [role, roleResult] of Object.entries(result.roles)) {
          io.stdout(`Built ${role} (${roleResult.paths.length} outputs)\n`);
        }
      } finally {
        await result.close();
      }
      return 0;
    } catch (error) {
      io.stderr(formatError(error));
      return 1;
    }
  }

  if (command === 'dev') {
    try {
      const server = await createServer(parseDevOptions(commandArgs));
      io.stdout(`Development session listening on ${server.urls.join(', ')}\n`);
      await new Promise<void>((resolvePromise) => {
        server.electronProcess.once('exit', () => {
          resolvePromise();
        });
      });
      await server.close();
      return 0;
    } catch (error) {
      io.stderr(formatError(error));
      return 1;
    }
  }

  if (command === 'inspect') {
    try {
      const { format, options } = parseInspectOptions(commandArgs);
      const result = await inspect(options);
      for (const warning of result.warnings) {
        io.stderr(`[${warning.code}] ${warning.message}\n`);
      }
      io.stdout(result.format(format));
      return 0;
    } catch (error) {
      io.stderr(formatError(error));
      return 1;
    }
  }

  if (command === 'preview') {
    try {
      const { options } = parseSharedOptions(commandArgs);
      const result = await preview(options);
      io.stdout('Preview session started.\n');
      await new Promise<void>((resolvePromise) => {
        result.electronProcess.once('exit', () => {
          resolvePromise();
        });
      });
      await result.close();
      return 0;
    } catch (error) {
      io.stderr(formatError(error));
      return 1;
    }
  }

  io.stderr(`Unknown command: ${command}\n\n${help}`);
  return 1;
}
