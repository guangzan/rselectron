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
    'tests/fixtures/**',
    '**/node.d.ts',
  ]),
  ts.configs.recommended,
]);
