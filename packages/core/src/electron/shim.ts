import type { RsbuildConfig, RsbuildPlugin } from '@rsbuild/core';
import type { Role, RoleConfig, RoleModuleFormat } from '../types.ts';

/** Unique marker so tests and re-entry checks can detect our thin shim. */
export const ESM_REQUIRE_SHIM_MARKER = 'rselectron-esm-require-shim';

const FREE_REQUIRE_RE = /\brequire\s*\(|\brequire\.resolve\s*\(/;

const ESM_STATIC_IMPORT_RE =
  /(?<=\s|^|;)import\s*([\s"']*(?<imports>[\p{L}\p{M}\w\t\n\r $*,/{}@.]+)from\s*)?["']\s*(?<specifier>(?<="\s*)[^"]*[^\s"](?=\s*")|(?<='\s*)[^']*[^\s'](?=\s*'))\s*["'][\s;]*/gmu;

const THIN_REQUIRE_SHIM = `
// ${ESM_REQUIRE_SHIM_MARKER}
import { createRequire as __rselectron_createRequire } from 'node:module';
const require = __rselectron_createRequire(import.meta.url);
`;

interface StaticImport {
  end: number;
}

function findStaticImports(code: string): StaticImport[] {
  const matches: StaticImport[] = [];
  for (const match of code.matchAll(ESM_STATIC_IMPORT_RE)) {
    matches.push({ end: (match.index ?? 0) + match[0].length });
  }
  return matches;
}

/**
 * Inject a thin createRequire helper when free require/require.resolve remain.
 * Does not rewrite __dirname/__filename (Rspack node-module owns those).
 */
export function injectThinEsmRequireShim(code: string): string {
  if (code.includes(ESM_REQUIRE_SHIM_MARKER) || !FREE_REQUIRE_RE.test(code)) {
    return code;
  }

  const lastImport = findStaticImports(code).pop();
  const index = lastImport === undefined ? 0 : lastImport.end;
  return `${code.slice(0, index)}${THIN_REQUIRE_SHIM}${code.slice(index)}`;
}

function createEsmRequireShimPlugin(): RsbuildPlugin {
  return {
    name: 'rselectron:esm-require-shim',
    setup(api) {
      api.modifyRspackConfig((config) => {
        // Prefer Rspack Node ESM defaults for dirname/filename under output.module.
        const existingNode =
          typeof config.node === 'object' && config.node !== null
            ? config.node
            : {};
        config.node = {
          ...existingNode,
          __dirname: 'node-module',
          __filename: 'node-module',
        };

        const plugins = [...(config.plugins ?? [])];
        plugins.push({
          name: 'rselectron-esm-require-shim',
          apply(compiler: {
            hooks: {
              compilation: {
                tap: (
                  name: string,
                  fn: (compilation: {
                    hooks: {
                      processAssets: {
                        tap: (
                          options: { name: string; stage: number },
                          callback: (assets: Record<string, { source: () => string | Buffer }>) => void,
                        ) => void;
                      };
                    };
                    updateAsset: (
                      file: string,
                      source: { source: () => string | Buffer },
                    ) => void;
                  }) => void,
                ) => void;
              };
            };
            webpack: {
              Compilation: { PROCESS_ASSETS_STAGE_OPTIMIZE: number };
              sources: {
                RawSource: new (
                  source: string | Buffer,
                ) => { source: () => string | Buffer };
              };
            };
          }) {
            const { Compilation, sources } = compiler.webpack;
            compiler.hooks.compilation.tap(
              'rselectron-esm-require-shim',
              (compilation) => {
                compilation.hooks.processAssets.tap(
                  {
                    name: 'rselectron-esm-require-shim',
                    stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                  },
                  (assets) => {
                    for (const file of Object.keys(assets)) {
                      if (!/\.m?js(?:\.map)?$/.test(file) || file.endsWith('.map')) {
                        continue;
                      }
                      const asset = assets[file];
                      if (asset === undefined) {
                        continue;
                      }
                      const raw = asset.source();
                      const code =
                        typeof raw === 'string' ? raw : raw.toString('utf8');
                      const next = injectThinEsmRequireShim(code);
                      if (next !== code) {
                        compilation.updateAsset(
                          file,
                          new sources.RawSource(next),
                        );
                      }
                    }
                  },
                );
              },
            );
          },
        });
        config.plugins = plugins;
        return config;
      });
    },
  };
}

/**
 * On-demand ESM require shim + explicit node-module dirname/filename for
 * ESM Main/Preload Roles (ADR 0009 layer C).
 */
export function applyEsmRequireShim(
  role: Role,
  config: RoleConfig,
  format: RoleModuleFormat | undefined,
): RoleConfig {
  if (role === 'renderer' || format !== 'esm') {
    return config;
  }

  const plugins = [...(config.plugins ?? []), createEsmRequireShimPlugin()];

  return {
    ...config,
    plugins: plugins as RsbuildConfig['plugins'],
  };
}
