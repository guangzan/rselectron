import { defineConfig } from '@rslib/core';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig({
  lib: [
    {
      autoExternal: false,
      dts: {
        bundle: true,
      },
      format: 'esm',
    },
  ],
  output: {
    externals: ['@rsbuild/core', /^@rsbuild\/core\//],
    target: 'node',
  },
  source: {
    define: {
      RSELECTRON_VERSION: JSON.stringify(packageJson.version),
    },
    entry: {
      cli: './src/cli.ts',
      index: './src/index.ts',
    },
    tsconfigPath: './tsconfig.json',
  },
});
