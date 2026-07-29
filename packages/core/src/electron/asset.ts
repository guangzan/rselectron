import type { RsbuildConfig, RsbuildPlugin } from '@rsbuild/core';
import { fileURLToPath } from 'node:url';
import type { Role, RoleConfig } from '../types.ts';
import { electronQuery } from './native.ts';

const assetLoaderPath = fileURLToPath(
  new URL('../loaders/asset-loader.cjs', import.meta.url),
);

const assetQuery = /(?:\?|&)asset(?:&|$)/;

function createAssetPlugin(appRoot: string): RsbuildPlugin {
  return {
    name: 'rselectron:electron-asset',
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
          .rule('rselectron-electron-asset')
          .before(CHAIN_ID.RULE.JS)
          .resourceQuery(assetQuery)
          .type('javascript/auto')
          .use('rselectron-electron-asset')
          .loader(assetLoaderPath)
          .options({
            appRoot,
            resourcesDir: 'resources',
          });
      });
    },
  };
}

/**
 * Wire `?asset` / `?asset&asarUnpack` for Main and Preload Roles.
 * Renderer keeps default Rsbuild web asset handling.
 */
export function applyAssetHandling(
  role: Role,
  config: RoleConfig,
  appRoot: string,
): RoleConfig {
  if (role === 'renderer') {
    return config;
  }

  const plugins = [...(config.plugins ?? []), createAssetPlugin(appRoot)];

  return {
    ...config,
    plugins: plugins as RsbuildConfig['plugins'],
  };
}
