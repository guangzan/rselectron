import { defineConfig } from '@rstest/core';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(
  readFileSync(
    new URL('./packages/rselectron/package.json', import.meta.url),
    'utf8',
  ),
) as { version: string };

export default defineConfig({
  exclude: ['.repos/**', 'e2e/**', 'examples/**', 'website/**'],
  source: {
    define: {
      RSELECTRON_VERSION: JSON.stringify(packageJson.version),
    },
  },
  testEnvironment: 'node',
  testTimeout: 60_000,
});
