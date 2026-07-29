import type { RsbuildPlugin } from '@rsbuild/core';
import { fileURLToPath } from 'node:url';

const fixtureRoot = fileURLToPath(new URL('.', import.meta.url));
const startedRoles = new Set<string>();
export const closedRoles = new Set<string>();
let releaseAllRoles: (() => void) | undefined;
let rejectAllRoles: ((error: Error) => void) | undefined;
const allRolesStarted = new Promise<void>((resolve, reject) => {
  releaseAllRoles = resolve;
  rejectAllRoles = reject;
});
const concurrencyTimeout = setTimeout(() => {
  rejectAllRoles?.(new Error('Role builds did not start concurrently.'));
}, 10_000);
concurrencyTimeout.unref();

function concurrencyProbe(role: string): RsbuildPlugin {
  return {
    name: `fixture:concurrency-probe:${role}`,
    setup(api) {
      api.onCloseBuild(() => {
        closedRoles.add(role);
      });
      api.onBeforeBuild(async () => {
        startedRoles.add(role);
        if (startedRoles.size === 3) {
          clearTimeout(concurrencyTimeout);
          releaseAllRoles?.();
        }
        await allRolesStarted;
      });
    },
  };
}

export default {
  main: {
    root: `${fixtureRoot}/main`,
    plugins: [concurrencyProbe('main')],
    source: {
      entry: {
        index: './index.ts',
      },
    },
    output: {
      cleanDistPath: true,
      distPath: {
        root: '../out/main',
      },
      filename: {
        js: '[name].cjs',
      },
      filenameHash: false,
      minify: false,
      module: false,
      target: 'node' as const,
    },
    electron: {
      format: 'cjs' as const,
    },
  },
  preload: {
    root: `${fixtureRoot}/preload`,
    plugins: [concurrencyProbe('preload')],
    source: {
      entry: {
        index: './index.ts',
      },
    },
    output: {
      cleanDistPath: true,
      distPath: {
        root: '../out/preload',
      },
      filename: {
        js: '[name].mjs',
      },
      filenameHash: false,
      minify: false,
      module: true,
      target: 'node' as const,
    },
    electron: {
      format: 'esm' as const,
    },
  },
  renderer: {
    root: `${fixtureRoot}/renderer`,
    plugins: [concurrencyProbe('renderer')],
    source: {
      entry: {
        index: './index.ts',
      },
    },
    html: {
      template: './index.html',
    },
    output: {
      cleanDistPath: true,
      distPath: {
        root: '../out/renderer',
      },
      filenameHash: false,
      module: false,
      target: 'web' as const,
    },
  },
};
