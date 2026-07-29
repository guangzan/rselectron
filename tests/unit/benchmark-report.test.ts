import { expect, test } from '@rstest/core';
import {
  findMaterialRegressions,
  isBenchmarkReport,
} from '../../scripts/benchmarks/report-contract.ts';

test('benchmark report contract accepts a complete sample', () => {
  expect(
    isBenchmarkReport({
      cacheState: 'cold',
      generatedAt: '2026-07-25T00:00:00.000Z',
      environment: {
        arch: 'arm64',
        electron: '43.2.0',
        fixtureRevision: 'vanilla-v1',
        node: '22.22.1',
        platform: 'darwin',
        toolchain: {
          rselectron: '0.0.0',
          '@rsbuild/core': '2.1.7',
        },
      },
      samples: {
        rselectron: {
          coldBuildMs: 1200,
          rebuildMs: 400,
          devReadyMs: 1800,
          peakRssBytes: 200_000_000,
        },
        'electron-vite': null,
      },
    }),
  ).toBe(true);
});

test('material regression check uses a ratio threshold, not a fixed marketing multiplier', () => {
  const baseline = {
    coldBuildMs: 1000,
    rebuildMs: 500,
    devReadyMs: 2000,
    peakRssBytes: 100_000_000,
  };
  const ok = {
    coldBuildMs: 1500,
    rebuildMs: 600,
    devReadyMs: 2500,
    peakRssBytes: 120_000_000,
  };
  const bad = {
    coldBuildMs: 2500,
    rebuildMs: 600,
    devReadyMs: 2500,
    peakRssBytes: 120_000_000,
  };

  expect(findMaterialRegressions(ok, baseline, 2)).toEqual([]);
  expect(findMaterialRegressions(bad, baseline, 2)).toEqual([
    { metric: 'coldBuildMs', ratio: 2.5 },
  ]);
});
