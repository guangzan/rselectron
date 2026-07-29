import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generationLabel, includeRenderer } from './shared-options.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const outputRoot = join(root, 'out');

/** @type {import('../../../packages/rselectron/src/index.ts').RselectronConfig} */
const config = {
  main: {
    root: join(root, 'main'),
    source: {
      define: {
        __GENERATION_LABEL__: JSON.stringify(generationLabel),
      },
      entry: { index: './index.ts' },
    },
    output: {
      cleanDistPath: true,
      distPath: { root: join(outputRoot, 'main') },
      filename: { js: '[name].cjs' },
      filenameHash: false,
      minify: false,
      module: false,
      target: 'node',
    },
    tools: { rspack: { externals: ['electron'] } },
    electron: { format: 'cjs' },
  },
  preload: {
    root: join(root, 'preload'),
    source: { entry: { index: './index.ts' } },
    output: {
      cleanDistPath: true,
      distPath: { root: join(outputRoot, 'preload') },
      filename: { js: '[name].cjs' },
      filenameHash: false,
      minify: false,
      module: false,
      target: 'node',
    },
    tools: { rspack: { externals: ['electron'] } },
    electron: { format: 'cjs' },
  },
};

if (includeRenderer) {
  config.renderer = {
    root: join(root, 'renderer'),
    source: { entry: { index: './index.ts' } },
    html: { template: './index.html' },
    server: {
      port: 3900 + Math.floor(Math.random() * 200),
      printUrls: false,
      strictPort: false,
    },
    output: {
      cleanDistPath: true,
      distPath: { root: join(outputRoot, 'renderer') },
      filenameHash: false,
      module: false,
      target: 'web',
    },
  };
}

export default config;
