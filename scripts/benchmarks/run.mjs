#!/usr/bin/env node
/**
 * Measure cold build, rebuild, dev-ready, and peak RSS for equivalent fixtures.
 * Writes scripts/benchmarks/reports/latest.json conforming to report-contract.mjs.
 *
 * electron-vite comparison is best-effort: when electron-vite cannot be resolved
 * (including while 6.0.0 final remains unpublished), samples['electron-vite'] is null.
 */

import { spawn } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isBenchmarkReport, isToolingSample } from './report-contract.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(__dirname, '../..');
const reportsDir = join(__dirname, 'reports');
const fixtureRevision = 'vanilla-v1';
const rselectronFixture = join(__dirname, 'fixtures/rselectron-vanilla');
const electronViteFixture = join(__dirname, 'fixtures/electron-vite-vanilla');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function packageVersion(name, fromDir = repositoryRoot) {
  try {
    const require = createRequire(join(fromDir, 'package.json'));
    return require(`${name}/package.json`).version;
  } catch {
    return undefined;
  }
}

function peakTracker() {
  let peak = process.memoryUsage().rss;
  const timer = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 50);
  timer.unref();
  return {
    stop() {
      clearInterval(timer);
      peak = Math.max(peak, process.memoryUsage().rss);
      return peak;
    },
  };
}

async function measureMs(fn) {
  const started = performance.now();
  await fn();
  return performance.now() - started;
}

function cleanFixtureOutputs(fixtureRoot) {
  for (const name of ['out', 'dist', 'node_modules/.cache', '.rselectron']) {
    rmSync(join(fixtureRoot, name), { force: true, recursive: true });
  }
}

async function loadRselectronApi() {
  const distEntry = join(repositoryRoot, 'packages/rselectron/dist/index.js');
  if (!existsSync(distEntry)) {
    throw new Error(
      'packages/rselectron/dist/index.js is missing; run `pnpm build` first.',
    );
  }
  return import(pathToFileURL(distEntry).href);
}

function installFakeElectron(appRoot, version) {
  const electronRoot = join(appRoot, 'node_modules/electron');
  const execPath = join(appRoot, 'fake-electron.mjs');
  mkdirSync(electronRoot, { recursive: true });
  writeFileSync(
    join(electronRoot, 'package.json'),
    `${JSON.stringify(
      {
        main: 'index.js',
        name: 'electron',
        type: 'commonjs',
        version,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(electronRoot, 'index.js'),
    `module.exports = ${JSON.stringify(execPath)};\n`,
  );
  writeFileSync(
    execPath,
    `#!/usr/bin/env node
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const entry = process.argv[2];
if (entry === undefined) {
  throw new Error('fake electron requires an entry script');
}
const require = createRequire(import.meta.url);
try {
  require(entry);
} catch (error) {
  if (error && error.code === 'ERR_REQUIRE_ESM') {
    await import(pathToFileURL(entry).href);
  } else {
    throw error;
  }
}
`,
  );
  try {
    chmodSync(execPath, 0o755);
  } catch {
    // Windows does not need the executable bit.
  }
  return execPath;
}

async function measureRselectron() {
  const { build, createServer } = await loadRselectronApi();
  const configModule = await import(
    pathToFileURL(join(rselectronFixture, 'rselectron.config.mjs')).href
  );
  const config = configModule.default;
  const electronVersion = packageVersion('electron') ?? '43.2.0';
  installFakeElectron(rselectronFixture, electronVersion);

  cleanFixtureOutputs(rselectronFixture);
  const peak = peakTracker();

  const coldBuildMs = await measureMs(async () => {
    const result = await build({
      config,
      cwd: rselectronFixture,
    });
    await result.close();
  });

  const rebuildMs = await measureMs(async () => {
    const result = await build({
      config,
      cwd: rselectronFixture,
    });
    await result.close();
  });

  const markerPath = join(rselectronFixture, 'out/launch-marker.txt');
  rmSync(markerPath, { force: true });

  const devReadyMs = await measureMs(async () => {
    const server = await createServer({
      config,
      cwd: rselectronFixture,
    });
    // createServer resolves after the compile barrier and Electron spawn.
    // Wait briefly for the Main entry to prove the fake runtime executed it.
    const deadline = Date.now() + 5_000;
    while (!existsSync(markerPath) && Date.now() < deadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 25));
    }
    if (!existsSync(markerPath)) {
      await server.close();
      throw new Error(
        'dev-ready: Electron spawned but Main launch marker was missing',
      );
    }
    await server.close();
  });

  const peakRssBytes = peak.stop();
  return {
    coldBuildMs: Math.round(coldBuildMs),
    rebuildMs: Math.round(rebuildMs),
    devReadyMs: Math.round(devReadyMs),
    peakRssBytes,
  };
}

function runCommand(command, args, cwd, env = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }
      reject(
        new Error(`${command} ${args.join(' ')} failed (${code}): ${stderr}`),
      );
    });
  });
}

async function ensureElectronViteInstalled() {
  const bin = join(electronViteFixture, 'node_modules/.bin/electron-vite');
  if (existsSync(bin)) {
    return true;
  }
  try {
    await runCommand(
      'npm',
      [
        'install',
        '--no-save',
        '--no-package-lock',
        'electron-vite@6.0.0-beta.1',
        'vite@7',
      ],
      electronViteFixture,
    );
    return existsSync(bin);
  } catch {
    return false;
  }
}

async function measureElectronVite() {
  const available = await ensureElectronViteInstalled();
  if (!available) {
    return null;
  }

  cleanFixtureOutputs(electronViteFixture);
  const peak = peakTracker();
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  const coldBuildMs = await measureMs(async () => {
    await runCommand(npx, ['electron-vite', 'build'], electronViteFixture);
  });

  const rebuildMs = await measureMs(async () => {
    await runCommand(npx, ['electron-vite', 'build'], electronViteFixture);
  });

  // electron-vite dev launches Electron; measure build-only ready proxy via
  // a second cold-ish build after cleaning dist only (dev-ready analogue).
  rmSync(join(electronViteFixture, 'out'), { force: true, recursive: true });
  const devReadyMs = await measureMs(async () => {
    await runCommand(npx, ['electron-vite', 'build'], electronViteFixture);
  });

  const peakRssBytes = peak.stop();
  return {
    coldBuildMs: Math.round(coldBuildMs),
    rebuildMs: Math.round(rebuildMs),
    devReadyMs: Math.round(devReadyMs),
    peakRssBytes,
  };
}

async function main() {
  mkdirSync(reportsDir, { recursive: true });

  const rselectronSample = await measureRselectron();
  if (!isToolingSample(rselectronSample)) {
    throw new Error('rselectron sample failed contract validation');
  }

  let electronViteSample = null;
  if (process.env.RSELECTRON_BENCH_SKIP_EVITE !== '1') {
    electronViteSample = await measureElectronVite();
  }

  const report = {
    cacheState: 'cold',
    generatedAt: new Date().toISOString(),
    environment: {
      arch: process.arch,
      electron: packageVersion('electron') ?? 'unknown',
      fixtureRevision,
      node: process.versions.node,
      platform: process.platform,
      toolchain: {
        rselectron: readJson(
          join(repositoryRoot, 'packages/rselectron/package.json'),
        ).version,
        '@rsbuild/core': packageVersion('@rsbuild/core'),
        ...(electronViteSample === null
          ? {}
          : {
              electronVite:
                packageVersion('electron-vite', electronViteFixture) ??
                '6.0.0-beta.1',
            }),
      },
    },
    samples: {
      rselectron: rselectronSample,
      'electron-vite': electronViteSample,
    },
  };

  if (!isBenchmarkReport(report)) {
    throw new Error('generated report failed contract validation');
  }

  const latestPath = join(reportsDir, 'latest.json');
  writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`);

  if (process.env.RSELECTRON_BENCH_WRITE_BASELINE === '1') {
    const baselinePath = join(__dirname, 'baselines/rselectron.json');
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(
      baselinePath,
      `${JSON.stringify(
        {
          environment: {
            arch: report.environment.arch,
            platform: report.environment.platform,
            electron: report.environment.electron,
          },
          regressionThreshold: 2.5,
          samples: {
            rselectron: report.samples.rselectron,
          },
        },
        null,
        2,
      )}\n`,
    );
    console.log(`Wrote baseline ${baselinePath}`);
  }

  console.log(`Wrote ${latestPath}`);
  console.log(JSON.stringify(report.samples, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
