import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('rselectron').RselectronConfig} */
export default {
  main: {
    root: join(fixtureRoot, 'src/main'),
    source: { entry: { index: './index.ts' } },
    output: {
      cleanDistPath: true,
      distPath: { root: join(fixtureRoot, 'out/main') },
      filename: { js: '[name].cjs' },
      filenameHash: false,
      target: 'node',
    },
    tools: { rspack: { externals: ['electron'] } },
    electron: { format: 'cjs' },
  },
  preload: {
    root: join(fixtureRoot, 'src/preload'),
    source: { entry: { index: './index.ts' } },
    output: {
      cleanDistPath: true,
      distPath: { root: join(fixtureRoot, 'out/preload') },
      filename: { js: '[name].cjs' },
      filenameHash: false,
      target: 'node',
    },
    tools: { rspack: { externals: ['electron'] } },
    electron: { format: 'cjs' },
  },
  renderer: {
    root: join(fixtureRoot, 'src/renderer'),
    source: { entry: { index: './index.ts' } },
    html: { template: './index.html' },
    server: {
      port: 3790,
      printUrls: false,
      strictPort: false,
    },
    output: {
      cleanDistPath: true,
      distPath: { root: join(fixtureRoot, 'out/renderer') },
      filenameHash: false,
      target: 'web',
    },
  },
};
