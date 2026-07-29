#!/usr/bin/env node
/**
 * Compare scripts/benchmarks/reports/latest.json against the committed baseline.
 * Skips (exit 0) when host platform/arch/electron do not match the baseline so
 * CI on other runners does not fail on absolute timing differences.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findMaterialRegressions,
  isBenchmarkReport,
  isToolingSample,
} from './report-contract.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baselinePath = join(__dirname, 'baselines/rselectron.json');
const latestPath = join(__dirname, 'reports/latest.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  if (!existsSync(baselinePath)) {
    console.error(`Missing baseline: ${baselinePath}`);
    process.exitCode = 1;
    return;
  }
  if (!existsSync(latestPath)) {
    console.error(
      `Missing report: ${latestPath}. Run \`pnpm bench\` first, or rely on contract unit tests in CI.`,
    );
    process.exitCode = 1;
    return;
  }

  const baseline = readJson(baselinePath);
  const report = readJson(latestPath);

  if (
    !isBenchmarkReport(report) ||
    !isToolingSample(baseline.samples?.rselectron)
  ) {
    console.error('Baseline or report failed contract validation.');
    process.exitCode = 1;
    return;
  }

  const env = report.environment;
  const baseEnv = baseline.environment;
  if (
    env.platform !== baseEnv.platform ||
    env.arch !== baseEnv.arch ||
    env.electron !== baseEnv.electron
  ) {
    console.log(
      `Skipping material regression check: host ${env.platform}/${env.arch}/electron@${env.electron} != baseline ${baseEnv.platform}/${baseEnv.arch}/electron@${baseEnv.electron}`,
    );
    return;
  }

  const threshold = Number(baseline.regressionThreshold);
  if (!Number.isFinite(threshold) || threshold <= 1) {
    console.error('baseline.regressionThreshold must be a number > 1');
    process.exitCode = 1;
    return;
  }

  const regressions = findMaterialRegressions(
    report.samples.rselectron,
    baseline.samples.rselectron,
    threshold,
  );

  if (regressions.length > 0) {
    console.error('Material benchmark regressions detected:');
    for (const item of regressions) {
      console.error(
        `  ${item.metric}: ratio=${item.ratio.toFixed(2)} (threshold ${threshold})`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Benchmark check passed against ${baselinePath} (threshold ${threshold}).`,
  );
}

main();
