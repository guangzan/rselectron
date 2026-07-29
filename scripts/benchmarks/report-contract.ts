/**
 * Shared benchmark report contract for RELEASE-003.
 * Material regression = ratio above threshold vs recorded baseline,
 * not a fixed marketing multiplier over electron-vite.
 */

export const BENCHMARK_METRICS = [
  'coldBuildMs',
  'rebuildMs',
  'devReadyMs',
  'peakRssBytes',
] as const;

export type BenchmarkMetric = (typeof BENCHMARK_METRICS)[number];

export interface ToolingSample {
  coldBuildMs: number;
  rebuildMs: number;
  devReadyMs: number;
  peakRssBytes: number;
}

export interface BenchmarkEnvironment {
  arch: string;
  electron: string;
  fixtureRevision: string;
  node: string;
  platform: string;
  toolchain: {
    '@rsbuild/core'?: string;
    electronVite?: string;
    rselectron: string;
  };
}

export interface BenchmarkReport {
  cacheState: 'cold' | 'warm';
  environment: BenchmarkEnvironment;
  generatedAt: string;
  samples: {
    'electron-vite': ToolingSample | null;
    rselectron: ToolingSample;
  };
}

export function isToolingSample(value: unknown): value is ToolingSample {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const sample = value as ToolingSample;
  return BENCHMARK_METRICS.every(
    (metric) =>
      typeof sample[metric] === 'number' &&
      Number.isFinite(sample[metric]) &&
      sample[metric] >= 0,
  );
}

export function isBenchmarkReport(value: unknown): value is BenchmarkReport {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const report = value as BenchmarkReport;
  if (report.cacheState !== 'cold' && report.cacheState !== 'warm') {
    return false;
  }
  if (
    typeof report.generatedAt !== 'string' ||
    report.environment === undefined ||
    report.samples === undefined
  ) {
    return false;
  }
  return isToolingSample(report.samples.rselectron);
}

export function findMaterialRegressions(
  measured: ToolingSample,
  baseline: ToolingSample,
  threshold: number,
): Array<{ metric: BenchmarkMetric; ratio: number }> {
  const regressions: Array<{ metric: BenchmarkMetric; ratio: number }> = [];
  for (const metric of BENCHMARK_METRICS) {
    const base = baseline[metric];
    if (base <= 0) {
      continue;
    }
    const ratio = measured[metric] / base;
    if (ratio > threshold) {
      regressions.push({ metric, ratio });
    }
  }
  return regressions;
}
