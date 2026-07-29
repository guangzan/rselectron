import { afterAll, beforeAll, expect, test } from '@rstest/core';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  build,
  preview,
  type RselectronConfig,
} from '../../packages/rselectron/src/index.ts';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(import.meta.dirname, '../fixtures/vanilla-preview');
const outputRoot = join(fixtureRoot, 'out');
const markerPath = join(outputRoot, 'preview-marker.json');

function createPreviewConfig(): RselectronConfig {
  return {
    main: {
      root: join(fixtureRoot, 'main'),
      source: { entry: { index: './index.ts' } },
      output: {
        cleanDistPath: true,
        distPath: { root: join(outputRoot, 'main') },
        filename: { js: '[name].cjs' },
        filenameHash: false,
        minify: false,
        module: false,
        target: 'node',
      },
      tools: { rspack: { externals: ['electron'] } },
      electron: { format: 'cjs' },
    },
    renderer: {
      root: join(fixtureRoot, 'renderer'),
      source: { entry: { index: './index.ts' } },
      html: { template: './index.html' },
      output: {
        cleanDistPath: true,
        distPath: { root: join(outputRoot, 'renderer') },
        filenameHash: false,
        module: false,
        target: 'web',
      },
    },
  };
}

beforeAll(() => {
  mkdirSync(join(fixtureRoot, 'main'), { recursive: true });
  mkdirSync(join(fixtureRoot, 'renderer'), { recursive: true });
  mkdirSync(join(fixtureRoot, 'node_modules'), { recursive: true });
  const electronLink = join(fixtureRoot, 'node_modules/electron');
  rmSync(electronLink, { force: true });
  symlinkSync(
    join(repositoryRoot, 'node_modules/electron'),
    electronLink,
    'dir',
  );

  writeFileSync(
    join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'vanilla-preview-fixture',
        private: true,
        main: './out/main/index.cjs',
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(fixtureRoot, 'main/index.ts'),
    [
      "import { app } from 'electron';",
      "import { writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      'const marker = join(__dirname, "../preview-marker.json");',
      'writeFileSync(marker, JSON.stringify({ pid: process.pid, args: process.argv.slice(1) }, null, 2));',
      'app.whenReady().then(() => app.quit());',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(fixtureRoot, 'renderer/index.html'),
    '<!doctype html><html><body><div id="app">preview</div></body></html>\n',
  );
  writeFileSync(
    join(fixtureRoot, 'renderer/index.ts'),
    'document.querySelector("#app")!.textContent = "preview-ready";\n',
  );
});

afterAll(() => {
  rmSync(outputRoot, { force: true, recursive: true });
  rmSync(markerPath, { force: true });
});

async function waitForMarker(): Promise<{ args: string[]; pid: number }> {
  const started = Date.now();
  while (Date.now() - started < 20_000) {
    if (existsSync(markerPath)) {
      return JSON.parse(readFileSync(markerPath, 'utf8')) as {
        args: string[];
        pid: number;
      };
    }
    await delay(100);
  }
  throw new Error('Timed out waiting for preview marker.');
}

test('preview builds production output then launches Electron', async () => {
  rmSync(markerPath, { force: true });
  rmSync(outputRoot, { force: true, recursive: true });

  const result = await preview({
    config: createPreviewConfig(),
    cwd: fixtureRoot,
  });

  try {
    expect(result.buildResult?.roles.main).toBeDefined();
    expect(result.electronProcess.pid).toBeTypeOf('number');
    const marker = await waitForMarker();
    expect(marker.pid).toBe(result.electronProcess.pid);
    expect(existsSync(join(outputRoot, 'main/index.cjs'))).toBe(true);
    expect(existsSync(join(outputRoot, 'renderer/index.html'))).toBe(true);
  } finally {
    await result.close();
    await result.close();
  }
});

test('skip-build preview validates reused output and does not rebuild', async () => {
  rmSync(markerPath, { force: true });
  // Ensure outputs exist from previous test; rebuild once if needed.
  if (!existsSync(join(outputRoot, 'main/index.cjs'))) {
    const warm = await preview({
      config: createPreviewConfig(),
      cwd: fixtureRoot,
    });
    await waitForMarker();
    await warm.close();
    rmSync(markerPath, { force: true });
  }

  const before = readFileSync(join(outputRoot, 'main/index.cjs'), 'utf8');
  const result = await preview({
    config: createPreviewConfig(),
    cwd: fixtureRoot,
    skipBuild: true,
  });

  try {
    expect(result.buildResult).toBeUndefined();
    await waitForMarker();
    expect(readFileSync(join(outputRoot, 'main/index.cjs'), 'utf8')).toBe(
      before,
    );
  } finally {
    await result.close();
  }
});

test('production build warns when launch entry mismatches planned Main output', async () => {
  writeFileSync(
    join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'vanilla-preview-fixture',
        private: true,
        main: './not-the-main.cjs',
      },
      null,
      2,
    )}\n`,
  );

  const result = await build({
    config: createPreviewConfig(),
    cwd: fixtureRoot,
  });

  try {
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RSELECTRON_ELECTRON_ENTRY_MISMATCH',
          role: 'main',
        }),
      ]),
    );
  } finally {
    await result.close();
    writeFileSync(
      join(fixtureRoot, 'package.json'),
      `${JSON.stringify(
        {
          name: 'vanilla-preview-fixture',
          private: true,
          main: './out/main/index.cjs',
        },
        null,
        2,
      )}\n`,
    );
  }
});

test('preview fails when launch entry mismatches planned Main output', async () => {
  writeFileSync(
    join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'vanilla-preview-fixture',
        private: true,
        main: './not-the-main.cjs',
      },
      null,
      2,
    )}\n`,
  );

  await expect(
    preview({
      config: createPreviewConfig(),
      cwd: fixtureRoot,
      skipBuild: true,
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_ELECTRON_ENTRY_MISMATCH',
    role: 'electron',
  });

  writeFileSync(
    join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'vanilla-preview-fixture',
        private: true,
        main: './out/main/index.cjs',
      },
      null,
      2,
    )}\n`,
  );
});

test('preview forwards electron args exactly once', async () => {
  rmSync(markerPath, { force: true });
  const result = await preview({
    config: {
      ...createPreviewConfig(),
      electron: {
        args: ['--no-sandbox', '--inspect=0'],
      },
    },
    cwd: fixtureRoot,
    skipBuild: true,
  });

  try {
    const marker = await waitForMarker();
    expect(marker.args.filter((arg) => arg === '--no-sandbox')).toHaveLength(1);
    expect(marker.args.some((arg) => arg.startsWith('--inspect='))).toBe(true);
  } finally {
    await result.close();
  }
});
