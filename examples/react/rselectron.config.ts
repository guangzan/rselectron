import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from 'electron-rstack';

export default defineConfig({
  main: {
    root: './src/main',
    source: { entry: { index: './index.ts' } },
  },
  preload: {
    root: './src/preload',
    source: { entry: { index: './index.ts' } },
  },
  renderer: {
    root: './src/renderer',
    source: { entry: { index: './index.tsx' } },
    plugins: [pluginReact()],
  },
});
