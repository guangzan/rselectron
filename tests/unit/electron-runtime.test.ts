import { afterAll, expect, test } from '@rstest/core';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import {
  build,
  ELECTRON_SUPPORT_SNAPSHOT,
  resolveProjectElectron,
} from '../../packages/rselectron/src/index.ts';
import { electronChromeBrowserslist } from '../../packages/core/src/electron/snapshot.ts';
import { plannedMainEntry } from '../../packages/core/src/electron/entry.ts';
import { normalizeRuntime } from '../../packages/core/src/electron/runtime.ts';
import { writeFakeElectron } from '../helpers/fake-electron.ts';

const roots: string[] = [];

function createAppRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-${name}-`));
  roots.push(root);
  return root;
}

function writePackageJson(
  appRoot: string,
  packageJson: Record<string, unknown>,
): void {
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
}

function writeRoleSources(appRoot: string): void {
  for (const role of ['main', 'preload', 'renderer'] as const) {
    const roleRoot = join(appRoot, role);
    mkdirSync(roleRoot, { recursive: true });
    writeFileSync(
      join(roleRoot, 'index.ts'),
      `console.log('${role}-ready');\n`,
    );
  }
  writeFileSync(
    join(appRoot, 'renderer/index.html'),
    '<!doctype html><html><body><div id="app"></div></body></html>\n',
  );
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

test('the frozen support snapshot matches the published optional peer window', () => {
  expect(ELECTRON_SUPPORT_SNAPSHOT.majors).toEqual([
    28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
  ]);
  expect(ELECTRON_SUPPORT_SNAPSHOT.peerRange).toBe('>=28 <44');
  expect(ELECTRON_SUPPORT_SNAPSHOT.byMajor[28]).toMatchObject({
    chrome: '120.0.6099.56',
    firstStable: '28.0.0',
    node: '18.18.2',
  });
  expect(ELECTRON_SUPPORT_SNAPSHOT.byMajor[37]).toMatchObject({
    chrome: '138.0.7204.35',
    firstStable: '37.0.0',
  });
  expect(ELECTRON_SUPPORT_SNAPSHOT.byMajor[43]).toMatchObject({
    chrome: '150.0.7871.46',
    firstStable: '43.0.0',
    node: '24.17.0',
  });
  for (const major of ELECTRON_SUPPORT_SNAPSHOT.majors) {
    expect(ELECTRON_SUPPORT_SNAPSHOT.byMajor[major]!.esm).toBe(true);
  }
});

test('electronChromeBrowserslist is exact below the browserslist-rs ceiling and clamps at K=138', () => {
  expect(electronChromeBrowserslist(28)).toBe('chrome >= 120');
  expect(electronChromeBrowserslist(37)).toBe('chrome >= 138');
  expect(electronChromeBrowserslist(43)).toBe('chrome >= 138');
});

test('resolveProjectElectron reads Electron from the Application root', () => {
  const appRoot = createAppRoot('resolve');
  writePackageJson(appRoot, { name: 'app', private: true });
  const execPath = writeFakeElectron({
    appRoot,
    version: '43.2.0',
  });

  const resolved = resolveProjectElectron(appRoot);
  expect(resolved.major).toBe(43);
  expect(resolved.version).toBe('43.2.0');
  expect(resolved.execPath).toBe(execPath);
  expect(resolved.root).toContain(`${sep}node_modules${sep}electron`);
});

test('build derives Node and Chromium targets from a supported project-local Electron', async () => {
  const appRoot = createAppRoot('derive');
  writePackageJson(appRoot, { name: 'app', private: true });
  writeRoleSources(appRoot);
  writeFakeElectron({ appRoot, version: '41.10.3' });

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          target: 'node',
        },
        electron: { format: 'auto' },
      },
      renderer: {
        root: join(appRoot, 'renderer'),
        source: { entry: { index: './index.ts' } },
        html: { template: './index.html' },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/renderer') },
          filenameHash: false,
          target: 'web',
        },
      },
    },
    cwd: appRoot,
  });

  expect(result.runtime?.electron).toMatchObject({
    major: 41,
    version: '41.10.3',
  });
  expect(result.runtime?.targets.main).toEqual(['electron41-main']);
  expect(result.runtime?.targets.renderer).toEqual(['chrome >= 138']);
  expect(ELECTRON_SUPPORT_SNAPSHOT.byMajor[41]).toMatchObject({
    chrome: '146.0.7680.65',
    node: '24.14.0',
  });
  expect(result.runtime?.formats.main).toBe('cjs');
  await result.close();
});

test('build derives targets for the widened window floor from a project-local Electron 28', async () => {
  const appRoot = createAppRoot('derive-28');
  writePackageJson(appRoot, { name: 'app', private: true });
  writeRoleSources(appRoot);
  writeFakeElectron({ appRoot, version: '28.3.3' });

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          target: 'node',
        },
        electron: { format: 'auto' },
      },
      renderer: {
        root: join(appRoot, 'renderer'),
        source: { entry: { index: './index.ts' } },
        html: { template: './index.html' },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/renderer') },
          filenameHash: false,
          target: 'web',
        },
      },
    },
    cwd: appRoot,
  });

  expect(result.runtime?.electron).toMatchObject({
    major: 28,
    version: '28.3.3',
  });
  expect(result.runtime?.targets.main).toEqual(['electron28-main']);
  expect(result.runtime?.targets.renderer).toEqual(['chrome >= 120']);
  expect(ELECTRON_SUPPORT_SNAPSHOT.byMajor[28]).toMatchObject({
    chrome: '120.0.6099.56',
    node: '18.18.2',
  });
  expect(result.runtime?.formats.main).toBe('cjs');
  await result.close();
});

test('normalizeRuntime writes clamped Renderer overrideBrowserslist and leaves rspack target unset', () => {
  const appRoot = createAppRoot('normalize-renderer-browserslist');
  writePackageJson(appRoot, { name: 'app', private: true });
  writeFakeElectron({ appRoot, version: '43.0.0' });

  const runtime = normalizeRuntime({
    appRoot,
    config: {
      renderer: {
        root: join(appRoot, 'renderer'),
        source: { entry: { index: './index.ts' } },
        html: { template: './index.html' },
        output: {
          target: 'web',
        },
      },
    },
  });

  expect(runtime.targets.renderer).toEqual(['chrome >= 138']);
  expect(runtime.roles.renderer?.output?.overrideBrowserslist).toEqual([
    'chrome >= 138',
  ]);
  expect(runtime.roles.renderer?.output?.target).toBe('web');
  const rspack = runtime.roles.renderer?.tools?.rspack;
  expect(
    typeof rspack === 'object' &&
      rspack !== null &&
      !Array.isArray(rspack) &&
      'target' in rspack,
  ).toBe(false);
  expect(
    runtime.warnings.some(
      (warning) => warning.code === 'RSELECTRON_RENDERER_NODE_INTEGRATION_RISK',
    ),
  ).toBe(false);
});

test('normalizeRuntime injects Conventional role outputs when distPath is unset', () => {
  const appRoot = createAppRoot('conventional-dist');
  writePackageJson(appRoot, { name: 'app', private: true, type: 'module' });
  writeFakeElectron({ appRoot, version: '43.0.0' });

  const runtime = normalizeRuntime({
    appRoot,
    config: {
      main: {
        root: join(appRoot, 'src/main'),
        source: { entry: { index: './index.ts' } },
      },
      preload: {
        root: join(appRoot, 'src/preload'),
        source: { entry: { index: './index.ts' } },
      },
      renderer: {
        root: join(appRoot, 'src/renderer'),
        source: { entry: { index: './index.ts' } },
        html: { template: './index.html' },
      },
    },
  });

  for (const role of ['main', 'preload', 'renderer'] as const) {
    const dist = runtime.roles[role]?.output?.distPath;
    expect(
      typeof dist === 'object' && dist !== null && !Array.isArray(dist),
    ).toBe(true);
    expect((dist as { root: string }).root).toBe(join(appRoot, 'out', role));
  }

  const planned = plannedMainEntry(appRoot, runtime.roles.main!);
  expect(planned).toBe(join(appRoot, 'out/main/index.mjs'));
});

test('normalizeRuntime preserves explicit distPath and fills missing object root', () => {
  const appRoot = createAppRoot('explicit-dist');
  writePackageJson(appRoot, { name: 'app', private: true });
  writeFakeElectron({ appRoot, version: '43.0.0' });

  const runtime = normalizeRuntime({
    appRoot,
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: { distPath: 'custom-main' },
      },
      preload: {
        root: join(appRoot, 'preload'),
        source: { entry: { index: './index.ts' } },
        output: { distPath: { root: join(appRoot, 'pack/preload') } },
      },
      renderer: {
        root: join(appRoot, 'renderer'),
        source: { entry: { index: './index.ts' } },
        html: { template: './index.html' },
        output: { distPath: { js: 'static/js' } },
      },
    },
  });

  expect(runtime.roles.main?.output?.distPath).toBe('custom-main');
  expect(runtime.roles.preload?.output?.distPath).toEqual({
    root: join(appRoot, 'pack/preload'),
  });
  expect(runtime.roles.renderer?.output?.distPath).toEqual({
    js: 'static/js',
    root: join(appRoot, 'out/renderer'),
  });
});

test('build selects ESM automatically for module packages on supported Electron', async () => {
  const appRoot = createAppRoot('auto-esm');
  writePackageJson(appRoot, { name: 'app', private: true, type: 'module' });
  writeRoleSources(appRoot);
  writeFakeElectron({ appRoot, version: '42.7.1' });

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].mjs' },
          filenameHash: false,
          target: 'node',
        },
        electron: { format: 'auto' },
      },
    },
    cwd: appRoot,
  });

  expect(result.runtime?.formats.main).toBe('esm');
  expect(result.runtime?.targets.main).toEqual(['electron42-main']);
  await result.close();
});

test('unsupported Electron majors fail with a structured error', async () => {
  for (const version of ['27.0.0', '44.0.0']) {
    const appRoot = createAppRoot('unsupported');
    writePackageJson(appRoot, { name: 'app', private: true });
    writeRoleSources(appRoot);
    writeFakeElectron({ appRoot, version });

    await expect(
      build({
        config: {
          main: {
            root: join(appRoot, 'main'),
            source: { entry: { index: './index.ts' } },
            output: {
              target: 'node',
            },
            electron: { format: 'auto' },
          },
        },
        cwd: appRoot,
      }),
    ).rejects.toMatchObject({
      code: 'RSELECTRON_ELECTRON_UNSUPPORTED',
      role: 'electron',
    });
  }
});

test('missing project-local Electron fails when runtime facts must be derived', async () => {
  const appRoot = createAppRoot('missing');
  writePackageJson(appRoot, { name: 'app', private: true });
  writeRoleSources(appRoot);

  await expect(
    build({
      config: {
        main: {
          root: join(appRoot, 'main'),
          source: { entry: { index: './index.ts' } },
          output: {
            target: 'node',
          },
          electron: { format: 'auto' },
        },
      },
      cwd: appRoot,
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_ELECTRON_NOT_FOUND',
    role: 'electron',
  });
});

test('a custom executable requires explicit runtime facts', async () => {
  const appRoot = createAppRoot('custom-exec');
  writePackageJson(appRoot, { name: 'app', private: true });
  writeRoleSources(appRoot);
  const packageExecPath = writeFakeElectron({
    appRoot,
    version: '43.2.0',
  });
  const customExecPath = join(appRoot, 'bin/custom-electron');

  await expect(
    build({
      config: {
        electron: {
          execPath: customExecPath,
        },
        main: {
          root: join(appRoot, 'main'),
          source: { entry: { index: './index.ts' } },
          output: {
            target: 'node',
          },
          electron: { format: 'auto' },
        },
      },
      cwd: appRoot,
    }),
  ).rejects.toMatchObject({
    code: 'RSELECTRON_ELECTRON_EXEC_INCONSISTENT',
    role: 'electron',
  });

  const result = await build({
    config: {
      electron: {
        execPath: customExecPath,
      },
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          overrideBrowserslist: ['node >= 24.17.0'],
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    },
    cwd: appRoot,
  });

  expect(result.runtime?.electron?.execPath).toBe(packageExecPath);
  expect(result.runtime?.launchExecPath).toBe(customExecPath);
  await result.close();
});

test('fully explicit source builds do not require Electron', async () => {
  const appRoot = createAppRoot('explicit');
  writePackageJson(appRoot, { name: 'app', private: true });
  writeRoleSources(appRoot);

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          overrideBrowserslist: ['node >= 20'],
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
      renderer: {
        root: join(appRoot, 'renderer'),
        source: { entry: { index: './index.ts' } },
        html: { template: './index.html' },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/renderer') },
          filenameHash: false,
          overrideBrowserslist: ['chrome >= 120'],
          target: 'web',
        },
      },
    },
    cwd: appRoot,
  });

  expect(result.runtime?.electron).toBeUndefined();
  expect(Object.keys(result.roles).sort()).toEqual(['main', 'renderer']);
  await result.close();
});

test('explicit format and browserslist do not require Electron or package.json', async () => {
  const appRoot = createAppRoot('explicit-browserslist');
  writeRoleSources(appRoot);

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].cjs' },
          filenameHash: false,
          module: false,
          overrideBrowserslist: ['node >= 20'],
        },
        electron: { format: 'cjs' },
      },
    },
    cwd: appRoot,
  });

  expect(result.runtime?.electron).toBeUndefined();
  expect(result.runtime?.targets.main).toEqual(['node >= 20']);
  expect(result.roles.main?.paths.some((path) => path.endsWith('.cjs'))).toBe(
    true,
  );
  await result.close();
});

test('unset filename defaults to .mjs for ESM Main and Preload', async () => {
  const appRoot = createAppRoot('filename-esm');
  writePackageJson(appRoot, { name: 'app', private: true, type: 'module' });
  writeRoleSources(appRoot);
  writeFakeElectron({ appRoot, version: '42.7.1' });

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          target: 'node',
        },
        electron: { format: 'esm' },
      },
      preload: {
        root: join(appRoot, 'preload'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/preload') },
          target: 'node',
        },
        electron: { format: 'esm' },
      },
    },
    cwd: appRoot,
  });

  try {
    expect(result.runtime?.formats.main).toBe('esm');
    expect(result.runtime?.formats.preload).toBe('esm');
    expect(
      result.roles.main?.paths.some((path) => path.endsWith('index.mjs')),
    ).toBe(true);
    expect(
      result.roles.preload?.paths.some((path) => path.endsWith('index.mjs')),
    ).toBe(true);
  } finally {
    await result.close();
  }
});

test('unset filename defaults to .cjs for CJS Main under type:module', async () => {
  const appRoot = createAppRoot('filename-cjs-module');
  writePackageJson(appRoot, {
    name: 'app',
    private: true,
    type: 'module',
    main: 'out/main/index.cjs',
  });
  writeRoleSources(appRoot);

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          module: false,
          overrideBrowserslist: ['node >= 20'],
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    },
    cwd: appRoot,
  });

  try {
    expect(result.runtime?.formats.main).toBe('cjs');
    expect(
      result.roles.main?.paths.some((path) => path.endsWith('index.cjs')),
    ).toBe(true);
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'RSELECTRON_ELECTRON_ENTRY_MISMATCH' }),
      ]),
    );
  } finally {
    await result.close();
  }
});

test('unset filename defaults to .js for CJS Main without type:module', async () => {
  const appRoot = createAppRoot('filename-cjs-js');
  writePackageJson(appRoot, {
    name: 'app',
    private: true,
    main: 'out/main/index.js',
  });
  writeRoleSources(appRoot);

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          module: false,
          overrideBrowserslist: ['node >= 20'],
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    },
    cwd: appRoot,
  });

  try {
    expect(result.runtime?.formats.main).toBe('cjs');
    expect(
      result.roles.main?.paths.some((path) => path.endsWith('index.js')),
    ).toBe(true);
  } finally {
    await result.close();
  }
});

test('explicit output.filename overrides the entry filename policy', async () => {
  const appRoot = createAppRoot('filename-explicit');
  writePackageJson(appRoot, { name: 'app', private: true, type: 'module' });
  writeRoleSources(appRoot);
  writeFakeElectron({ appRoot, version: '42.7.1' });

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].custom.mjs' },
          target: 'node',
        },
        electron: { format: 'esm' },
      },
    },
    cwd: appRoot,
  });

  try {
    expect(
      result.roles.main?.paths.some((path) =>
        path.endsWith('index.custom.mjs'),
      ),
    ).toBe(true);
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'RSELECTRON_ENTRY_FILENAME_RISK' }),
      ]),
    );
  } finally {
    await result.close();
  }
});

test('dangerous explicit .js filename warns and still builds', async () => {
  const appRoot = createAppRoot('filename-risk');
  writePackageJson(appRoot, {
    name: 'app',
    private: true,
    type: 'module',
    main: 'out/main/index.js',
  });
  writeRoleSources(appRoot);
  writeFakeElectron({ appRoot, version: '42.7.1' });

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].js' },
          target: 'node',
        },
        electron: { format: 'esm' },
      },
    },
    cwd: appRoot,
  });

  try {
    expect(
      result.roles.main?.paths.some((path) => path.endsWith('index.js')),
    ).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RSELECTRON_ENTRY_FILENAME_RISK',
          role: 'main',
        }),
      ]),
    );
  } finally {
    await result.close();
  }
});

test('dangerous .js under CJS type:module warns and still builds', async () => {
  const appRoot = createAppRoot('filename-risk-cjs');
  writePackageJson(appRoot, {
    name: 'app',
    private: true,
    type: 'module',
    main: 'out/main/index.js',
  });
  writeRoleSources(appRoot);

  const result = await build({
    config: {
      main: {
        root: join(appRoot, 'main'),
        source: { entry: { index: './index.ts' } },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/main') },
          filename: { js: '[name].js' },
          module: false,
          overrideBrowserslist: ['node >= 20'],
          target: 'node',
        },
        electron: { format: 'cjs' },
      },
    },
    cwd: appRoot,
  });

  try {
    expect(
      result.roles.main?.paths.some((path) => path.endsWith('index.js')),
    ).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RSELECTRON_ENTRY_FILENAME_RISK',
          role: 'main',
        }),
      ]),
    );
  } finally {
    await result.close();
  }
});
