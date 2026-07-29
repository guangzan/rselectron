import type { RsbuildConfig, RsbuildPlugin } from '@rsbuild/core';
import { fileURLToPath } from 'node:url';
import type { Role, RoleConfig } from '../types.ts';

const wasmLoaderPath = fileURLToPath(
  new URL('../loaders/wasm-loader.cjs', import.meta.url),
);
const nativeNodeLoaderPath = fileURLToPath(
  new URL('../loaders/native-node-loader.cjs', import.meta.url),
);

/** Exclude Electron query forms from default asset/JS rules. */
export const electronQuery =
  /(?:\?|&)(?:asset|modulePath|nodeWorker|loader)(?:&|$)/;

function createNativeAssetPlugin(appRoot: string): RsbuildPlugin {
  return {
    name: 'rselectron:electron-native-asset',
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
          .rule('rselectron-wasm-loader')
          .enforce('pre')
          .before(CHAIN_ID.RULE.JS)
          .test(/\.wasm$/i)
          .resourceQuery(/(?:\?|&)loader(?:&|$)/)
          .type('javascript/auto')
          .use('rselectron-wasm-loader')
          .loader(wasmLoaderPath)
          .options({
            appRoot,
            resourcesDir: 'resources',
          });
      });

      api.modifyRspackConfig((config) => {
        const optionsJson = JSON.stringify({
          appRoot,
          resourcesDir: 'resources',
        });
        const inlineLoader = `${nativeNodeLoaderPath}?${optionsJson}`;
        const plugins = [...(config.plugins ?? [])];
        plugins.push({
          name: 'rselectron-inline-native-node-loader',
          apply(compiler: {
            webpack: {
              NormalModuleReplacementPlugin: new (
                regex: RegExp,
                replacement: (resource: { request?: string }) => void,
              ) => { apply: (compiler: unknown) => void };
            };
          }) {
            const webpack = compiler.webpack;
            new webpack.NormalModuleReplacementPlugin(/\.node$/, (resource) => {
              const request = resource.request;
              if (
                typeof request !== 'string' ||
                request.includes('rselectron-native-node') ||
                request.includes(nativeNodeLoaderPath)
              ) {
                return;
              }
              // Bypass Rspack's built-in .node addon module type.
              resource.request = `!!${inlineLoader}!${request}`;
            }).apply(compiler);
          },
        });
        config.plugins = plugins;
        return config;
      });
    },
  };
}

/**
 * Wire `*.wasm?loader` and host-native `.node` imports for Main and Preload.
 * Does not transform or cross-compile native addons.
 */
export function applyNativeAssetHandling(
  role: Role,
  config: RoleConfig,
  appRoot: string,
): RoleConfig {
  if (role === 'renderer') {
    return config;
  }

  const plugins = [...(config.plugins ?? []), createNativeAssetPlugin(appRoot)];

  return {
    ...config,
    plugins: plugins as RsbuildConfig['plugins'],
  };
}
