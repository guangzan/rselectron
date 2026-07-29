import { afterAll, expect, test } from '@rstest/core';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../packages/rselectron/src/index.ts';

const roots: string[] = [];

function createRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `rselectron-renderer-${name}-`));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { force: true, recursive: true });
  }
});

test('Renderer isolated entries execute without shared chunks', async () => {
  const appRoot = createRoot('isolated-renderer');
  mkdirSync(join(appRoot, 'renderer/one'), { recursive: true });
  mkdirSync(join(appRoot, 'renderer/two'), { recursive: true });
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'isolated-renderer', private: true }, null, 2)}\n`,
  );
  writeFileSync(
    join(appRoot, 'renderer/shared.ts'),
    'export const marker = "isolated-shared-copy";\n',
  );
  writeFileSync(
    join(appRoot, 'renderer/one/index.ts'),
    'import { marker } from "../shared.ts";\ndocument.body.textContent = `one:${marker}`;\n',
  );
  writeFileSync(
    join(appRoot, 'renderer/two/index.ts'),
    'import { marker } from "../shared.ts";\ndocument.body.textContent = `two:${marker}`;\n',
  );
  writeFileSync(
    join(appRoot, 'renderer/one/index.html'),
    '<!doctype html><html><body></body></html>\n',
  );
  writeFileSync(
    join(appRoot, 'renderer/two/index.html'),
    '<!doctype html><html><body></body></html>\n',
  );

  const result = await build({
    cwd: appRoot,
    config: {
      renderer: {
        root: join(appRoot, 'renderer'),
        source: {
          entry: {
            one: './one/index.ts',
            two: './two/index.ts',
          },
        },
        html: {
          template({ entryName }) {
            return `./${entryName}/index.html`;
          },
        },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/renderer') },
          filenameHash: false,
          target: 'web',
        },
        electron: { isolatedEntries: true },
      },
    },
  });

  try {
    const files = readdirSync(join(appRoot, 'out/renderer'), {
      recursive: true,
    }).map(String);
    expect(files.some((name) => name.endsWith('one.js'))).toBe(true);
    expect(files.some((name) => name.endsWith('two.js'))).toBe(true);
    expect(files.some((name) => /async|chunk|vendor|runtime/i.test(name))).toBe(
      false,
    );

    const one = readFileSync(
      join(
        appRoot,
        'out/renderer',
        files.find((name) => name.endsWith('one.js'))!,
      ),
      'utf8',
    );
    const two = readFileSync(
      join(
        appRoot,
        'out/renderer',
        files.find((name) => name.endsWith('two.js'))!,
      ),
      'utf8',
    );
    expect(one).toContain('isolated-shared-copy');
    expect(two).toContain('isolated-shared-copy');
  } finally {
    await result.close();
  }
});

test('default Renderer web target exposes no Node process globals', async () => {
  const appRoot = createRoot('no-node');
  mkdirSync(join(appRoot, 'renderer'), { recursive: true });
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'no-node', private: true }, null, 2)}\n`,
  );
  writeFileSync(
    join(appRoot, 'renderer/index.html'),
    '<!doctype html><html><body><div id="app"></div></body></html>\n',
  );
  writeFileSync(
    join(appRoot, 'renderer/index.ts'),
    [
      'const hasNodeProcess =',
      "  typeof process !== 'undefined' &&",
      "  typeof (process as { versions?: { node?: string } }).versions?.node === 'string';",
      "document.querySelector('#app')!.textContent = hasNodeProcess",
      "  ? 'has-node-process'",
      "  : 'no-node-process';",
      '',
    ].join('\n'),
  );

  const result = await build({
    cwd: appRoot,
    config: {
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
  });

  try {
    expect(result.roles.renderer).toBeDefined();
    expect(
      result.warnings.some(
        (warning) =>
          warning.code === 'RSELECTRON_RENDERER_NODE_INTEGRATION_RISK',
      ),
    ).toBe(false);
    const html = readFileSync(join(appRoot, 'out/renderer/index.html'), 'utf8');
    const scriptMatch = html.match(/\bsrc="([^"]+\.js)"/);
    expect(scriptMatch?.[1]).toBeTypeOf('string');
    const scriptPath = join(
      appRoot,
      'out/renderer',
      scriptMatch![1]!.replace(/^\//, ''),
    );
    const bundle = readFileSync(scriptPath, 'utf8');
    expect(bundle).toMatch(/versions/);
    expect(bundle).toContain('no-node-process');
    expect(bundle).toContain('has-node-process');
  } finally {
    await result.close();
  }
});

test('advanced non-web Renderer target is retained with a security diagnostic', async () => {
  const appRoot = createRoot('risky-target');
  mkdirSync(join(appRoot, 'renderer'), { recursive: true });
  writeFileSync(
    join(appRoot, 'package.json'),
    `${JSON.stringify({ name: 'risky-target', private: true }, null, 2)}\n`,
  );
  writeFileSync(
    join(appRoot, 'renderer/index.html'),
    '<!doctype html><html><body></body></html>\n',
  );
  writeFileSync(
    join(appRoot, 'renderer/index.ts'),
    "console.log('renderer');\n",
  );

  const result = await build({
    cwd: appRoot,
    config: {
      renderer: {
        root: join(appRoot, 'renderer'),
        source: { entry: { index: './index.ts' } },
        html: { template: './index.html' },
        output: {
          cleanDistPath: true,
          distPath: { root: join(appRoot, 'out/renderer') },
          filenameHash: false,
          target: 'node',
        },
      },
    },
  });

  try {
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RSELECTRON_RENDERER_NODE_INTEGRATION_RISK',
          role: 'renderer',
          message: expect.stringMatching(/nodeIntegration/i),
        }),
      ]),
    );
    expect(result.roles.renderer).toBeDefined();
  } finally {
    await result.close();
  }
});
