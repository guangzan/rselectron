import type { RsbuildConfig, RsbuildPlugin } from '@rsbuild/core';
import { fileURLToPath } from 'node:url';
import type { Role, RoleConfig } from '../types.ts';
import { electronQuery } from './native.ts';

const modulePathLoaderPath = fileURLToPath(
  new URL('../loaders/module-path-loader.cjs', import.meta.url),
);

function createWorkerPlugin(): RsbuildPlugin {
  return {
    name: 'rselectron:electron-worker',
    setup(api) {
      api.modifyBundlerChain((chain, { CHAIN_ID }) => {
        for (const ruleId of Object.values(CHAIN_ID.RULE)) {
          if (typeof ruleId !== 'string') {
            continue;
          }
          try {
            chain.module.rule(ruleId).resourceQuery({ not: electronQuery });
          } catch {
            // Unregistered rule ids are ignored.
          }
        }

        chain.module
          .rule('rselectron-electron-worker')
          .enforce('pre')
          .before(CHAIN_ID.RULE.JS)
          .resourceQuery(/modulePath|nodeWorker/)
          .type('javascript/auto')
          .use('rselectron-electron-worker')
          .loader(modulePathLoaderPath);
      });
    },
  };
}

/**
 * Wire `?modulePath` / `?nodeWorker` for Main and Preload Roles.
 */
export function applyWorkerHandling(
  role: Role,
  config: RoleConfig,
): RoleConfig {
  if (role === 'renderer') {
    return config;
  }

  const plugins = [...(config.plugins ?? []), createWorkerPlugin()];

  return {
    ...config,
    plugins: plugins as RsbuildConfig['plugins'],
  };
}
