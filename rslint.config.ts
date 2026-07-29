import { defineConfig, globalIgnores, ts } from '@rslint/core';

export default defineConfig([
  globalIgnores([
    '.repos/**',
    'dist/**',
    'doc_build/**',
    'e2e/fixtures/**',
    'examples/**',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
    '**/node.d.ts',
  ]),
  ts.configs.recommended,
]);
