import { beforeAll, expect, test } from '@rstest/core';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const websiteRoot = join(repositoryRoot, 'website');
const docsRoot = join(websiteRoot, 'docs');
const isWindows = process.platform === 'win32';
const corepack = isWindows ? 'corepack.cmd' : 'corepack';

const requiredRelativePages = [
  'index.md',
  'guide/getting-started.mdx',
  'guide/troubleshooting.md',
  'guide/compatibility.md',
  'guide/migration.md',
  'config/index.md',
  'config/processes.md',
  'config/electron.md',
  'config/environment.md',
  'api/index.md',
  'api/cli.md',
  'api/javascript-api.md',
] as const;

const removedRelativePages = [
  'guide/cli.md',
  'guide/concepts.md',
  'config/configuration.md',
  'config/roles.md',
  'api/api.md',
] as const;

const knownPublicExports = new Set([
  'build',
  'createServer',
  'defineConfig',
  'ELECTRON_SUPPORT_SNAPSHOT',
  'envPrefixesForRole',
  'inspect',
  'loadEnv',
  'mergeRsbuildConfig',
  'mergeRselectronConfig',
  'preview',
  'resolveProjectElectron',
  'RSELECTRON_ENV_PREFIXES',
  'RselectronError',
  'version',
]);

const maintainedChineseDocs = [
  'docs/monorail/CONTEXT.zh.md',
  'README.zh.md',
  'docs/monorail/adr/zh/0001-capability-parity-not-drop-in-compatibility.md',
  'docs/monorail/adr/zh/0002-independent-rsbuild-instance-per-role.md',
  'docs/monorail/adr/zh/0003-promote-only-successful-role-generations.md',
  'docs/monorail/adr/zh/0004-publish-one-facade-package.md',
  'docs/monorail/adr/zh/0005-electron-is-an-optional-project-peer.md',
  'docs/monorail/adr/zh/0006-stable-cli-and-programmatic-contracts.md',
  'docs/monorail/adr/zh/0007-electron-role-build-contract.md',
  'docs/monorail/adr/zh/0008-release-quality-and-documentation-gates.md',
] as const;

function listMarkdownFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
      continue;
    }
    if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractMarkdownLinks(source: string): string[] {
  const links: string[] = [];
  const pattern = /\[[^\]]*]\(([^)]+)\)/g;
  for (const match of source.matchAll(pattern)) {
    const target = match[1]!.split(/\s+/)[0]!.replace(/^<|>$/g, '');
    if (
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('mailto:') ||
      target.startsWith('#')
    ) {
      continue;
    }
    links.push(target.split('#')[0]!);
  }
  return links;
}

function extractRselectronImports(source: string): string[] {
  const names: string[] = [];
  const pattern =
    /import\s*\{([^}]+)\}\s*from\s*['"]electron-rstack(?:\/node)?['"]/g;
  for (const match of source.matchAll(pattern)) {
    for (const part of match[1]!.split(',')) {
      const name = part
        .trim()
        .replace(/\s+as\s+\w+$/, '')
        .trim();
      if (name.length > 0 && !name.startsWith('type ')) {
        names.push(name.replace(/^type\s+/, ''));
      }
    }
  }
  return names;
}

beforeAll(() => {
  expect(existsSync(websiteRoot)).toBe(true);
});

test('bilingual docs pages, maintained Chinese repo docs, and examples exist', () => {
  for (const locale of ['en', 'zh'] as const) {
    for (const page of requiredRelativePages) {
      expect(existsSync(join(docsRoot, locale, page))).toBe(true);
    }
  }

  for (const relativePath of maintainedChineseDocs) {
    expect(existsSync(join(repositoryRoot, relativePath))).toBe(true);
  }

  expect(existsSync(join(repositoryRoot, 'examples/vanilla/README.md'))).toBe(
    true,
  );
  expect(existsSync(join(repositoryRoot, 'examples/react/README.md'))).toBe(
    true,
  );
  expect(
    existsSync(join(repositoryRoot, 'examples/vanilla/package.json')),
  ).toBe(true);
  expect(existsSync(join(repositoryRoot, 'examples/react/package.json'))).toBe(
    true,
  );
});

test('migration docs document parity exceptions in both languages', () => {
  for (const locale of ['en', 'zh'] as const) {
    const migration = readFileSync(
      join(docsRoot, locale, 'guide/migration.md'),
      'utf8',
    );
    expect(migration.toLowerCase()).toContain('vite');
    expect(migration.toLowerCase()).toContain('bytecode');
    expect(migration.toLowerCase()).toContain('swc');
  }
});

test('documentation relative links and rselectron code examples stay valid', () => {
  for (const locale of ['en', 'zh'] as const) {
    const localeRoot = join(docsRoot, locale);
    for (const filePath of listMarkdownFiles(localeRoot)) {
      const source = readFileSync(filePath, 'utf8');
      for (const link of extractMarkdownLinks(source)) {
        if (link.startsWith('/')) {
          const withoutLocale = link
            .replace(new RegExp(`^/${locale}`), '')
            .replace(/^\//, '');
          const candidates = [
            join(localeRoot, `${withoutLocale}.md`),
            join(localeRoot, `${withoutLocale}.mdx`),
            join(localeRoot, withoutLocale, 'index.md'),
            join(localeRoot, withoutLocale, 'index.mdx'),
          ];
          expect(candidates.some((candidate) => existsSync(candidate))).toBe(
            true,
          );
          continue;
        }
        const resolved = resolve(dirname(filePath), link);
        const candidates = [
          resolved,
          `${resolved}.md`,
          `${resolved}.mdx`,
          join(resolved, 'index.md'),
          join(resolved, 'index.mdx'),
        ];
        expect(candidates.some((candidate) => existsSync(candidate))).toBe(
          true,
        );
      }

      for (const imported of extractRselectronImports(source)) {
        expect(knownPublicExports.has(imported)).toBe(true);
      }
    }
  }
});

test('top nav exposes a single Docs entry with a unified sidebar in both locales', () => {
  for (const locale of ['en', 'zh'] as const) {
    const nav = JSON.parse(
      readFileSync(join(docsRoot, locale, '_nav.json'), 'utf8'),
    ) as Array<{ text: string; link: string; activeMatch?: string }>;

    const texts = nav.map((item) => item.text);
    if (locale === 'en') {
      expect(texts).toEqual(['Docs']);
    } else {
      expect(texts).toEqual(['文档']);
    }

    expect(nav[0]?.link).toBe('/guide/getting-started');
    expect(nav[0]?.activeMatch).toBe('/(guide|config|api)/');

    expect(existsSync(join(docsRoot, locale, 'guide/configuration.md'))).toBe(
      false,
    );
    expect(existsSync(join(docsRoot, locale, 'guide/api.md'))).toBe(false);

    for (const page of removedRelativePages) {
      expect(existsSync(join(docsRoot, locale, page))).toBe(false);
    }

    const rootMeta = JSON.parse(
      readFileSync(join(docsRoot, locale, '_meta.json'), 'utf8'),
    );
    const guideMeta = JSON.parse(
      readFileSync(join(docsRoot, locale, 'guide/_meta.json'), 'utf8'),
    );
    const configMeta = JSON.parse(
      readFileSync(join(docsRoot, locale, 'config/_meta.json'), 'utf8'),
    );
    const apiMeta = JSON.parse(
      readFileSync(join(docsRoot, locale, 'api/_meta.json'), 'utf8'),
    );

    const groupLabels =
      locale === 'en'
        ? (['Guide', 'Config', 'API'] as const)
        : (['指南', '配置', 'API'] as const);

    expect(rootMeta).toEqual([
      {
        type: 'dir-section-header',
        name: 'guide',
        label: groupLabels[0],
      },
      {
        type: 'dir-section-header',
        name: 'config',
        label: groupLabels[1],
      },
      {
        type: 'dir-section-header',
        name: 'api',
        label: groupLabels[2],
      },
    ]);
    expect(guideMeta).toEqual([
      'getting-started',
      'troubleshooting',
      'compatibility',
      'migration',
    ]);
    expect(configMeta).toEqual([
      'index',
      'processes',
      'electron',
      'environment',
    ]);
    expect(apiMeta).toEqual(['index', 'cli', 'javascript-api']);
  }
});

test('getting started and process config pages stay approachable and linked', () => {
  for (const locale of ['en', 'zh'] as const) {
    const gettingStarted = readFileSync(
      join(docsRoot, locale, 'guide/getting-started.mdx'),
      'utf8',
    );
    const processes = readFileSync(
      join(docsRoot, locale, 'config/processes.md'),
      'utf8',
    );

    expect(gettingStarted).toContain('PackageManagerTabs');
    expect(gettingStarted).toContain('defineConfig');
    expect(gettingStarted).toMatch(/rselectron dev/);
    expect(gettingStarted).toMatch(/rselectron build/);
    expect(gettingStarted).toMatch(/rselectron preview/);
    expect(gettingStarted).toContain('examples/');
    expect(gettingStarted).not.toMatch(/tests\/fixtures|fixtures\//);
    expect(gettingStarted).not.toMatch(
      /\bRole\b|Development session|Application root|Source build|Configuration generation/,
    );
    expect(gettingStarted).toMatch(/\/config\//);
    expect(gettingStarted).toMatch(/\/api\//);
    expect(gettingStarted).not.toMatch(
      /\/config\/configuration|\/api\/api|\/guide\/cli|\/guide\/concepts/,
    );

    expect(processes).toContain('defineConfig');
    expect(processes).toContain('main');
    expect(processes).toContain('preload');
    expect(processes).toContain('renderer');
    expect(processes).not.toMatch(/\bRole\b/);
    expect(processes).toMatch(/\/guide\/migration|migration/);
  }
});

test('home frontmatter is a thin pageType shell without dual-track hero features', () => {
  for (const locale of ['en', 'zh'] as const) {
    const index = readFileSync(join(docsRoot, locale, 'index.md'), 'utf8');

    expect(index).toMatch(/pageType:\s*home/);
    expect(index).not.toMatch(/^hero:/m);
    expect(index).not.toMatch(/^features:/m);
    expect(index).not.toMatch(/Benchmark|WhoIsUsing|ToolStack/);
  }
});

test('website depends on @rstack-dev/doc-ui for the landing page', () => {
  const pkg = JSON.parse(
    readFileSync(join(websiteRoot, 'package.json'), 'utf8'),
  ) as { dependencies?: Record<string, string> };
  expect(pkg.dependencies?.['@rstack-dev/doc-ui']).toBeTruthy();
});

test('documentation site publishes under the GitHub Pages project root', () => {
  const configSource = readFileSync(
    join(websiteRoot, 'rspress.config.ts'),
    'utf8',
  );

  expect(configSource).toContain("base: '/Rselectron/'");
  expect(configSource).toContain(
    "siteOrigin: 'https://guangzan.github.io'",
  );
  expect(configSource).toMatch(/\bllms:\s*true\b/);
  expect(configSource).toContain(
    'https://github.com/guangzan/electron-rstack/tree/main/website/docs',
  );
  expect(configSource).toContain('https://guangzan.github.io/Rselectron');
  expect(configSource).toMatch(/pluginSitemap/);
  expect(configSource).toMatch(/pluginOpenGraph/);
  expect(configSource).toContain("icon: 'github'");
  expect(configSource).toContain('https://github.com/guangzan/electron-rstack');
  expect(configSource).toContain("light: '/navbar-logo-light.png'");
  expect(configSource).toContain("dark: '/navbar-logo-dark.png'");
  expect(configSource).toContain("icon: '/favicon-128x128.png'");
  expect(configSource).not.toMatch(/pluginAlgolia|pluginRss|@rspress\/plugin-algolia|@rspress\/plugin-rss/);

  expect(
    existsSync(join(docsRoot, 'public', 'navbar-logo-light.png')),
  ).toBe(true);
  expect(existsSync(join(docsRoot, 'public', 'navbar-logo-dark.png'))).toBe(
    true,
  );
  expect(existsSync(join(docsRoot, 'public', 'favicon-128x128.png'))).toBe(
    true,
  );
});

test('Rspress documentation site builds', () => {
  const build = spawnSync(
    corepack,
    ['pnpm', '--filter', '@rselectron/website', 'build'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
    },
  );
  if (build.error !== undefined || build.status !== 0) {
    throw new Error(
      [
        `docs build failed with status ${String(build.status)}.`,
        build.error?.message,
        build.stdout,
        build.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
  expect(existsSync(join(websiteRoot, 'doc_build'))).toBe(true);

  expect(existsSync(join(websiteRoot, 'doc_build', 'llms.txt'))).toBe(true);
  expect(existsSync(join(websiteRoot, 'doc_build', 'llms-full.txt'))).toBe(
    true,
  );
  expect(
    existsSync(join(websiteRoot, 'doc_build', 'guide', 'getting-started.md')),
  ).toBe(true);
  expect(
    existsSync(join(websiteRoot, 'doc_build', 'zh', 'llms.txt')),
  ).toBe(true);

  const enGettingStarted = readFileSync(
    join(websiteRoot, 'doc_build', 'guide', 'getting-started.html'),
    'utf8',
  );
  expect(enGettingStarted).toContain('rp-llms-copy-button');
  expect(enGettingStarted).toContain('rp-llms-view-options__trigger');
  expect(enGettingStarted).toContain('Copy Markdown');

  const zhGettingStarted = readFileSync(
    join(websiteRoot, 'doc_build', 'zh', 'guide', 'getting-started.html'),
    'utf8',
  );
  expect(zhGettingStarted).toContain('rp-llms-copy-button');
  expect(zhGettingStarted).toContain('复制 Markdown');

  const sitemapPath = join(websiteRoot, 'doc_build', 'sitemap.xml');
  expect(existsSync(sitemapPath)).toBe(true);
  const sitemap = readFileSync(sitemapPath, 'utf8');
  expect(sitemap).toContain('https://guangzan.github.io/Rselectron');

  const enHome = readFileSync(
    join(websiteRoot, 'doc_build', 'index.html'),
    'utf8',
  );
  const zhHome = readFileSync(
    join(websiteRoot, 'doc_build', 'zh', 'index.html'),
    'utf8',
  );

  expect(enHome).toContain('Rselectron');
  expect(enHome).toContain('Electron tooling on Rspack');
  expect(enHome).toContain(
    'Develop and source-build Electron apps with Rsbuild and Rspack.',
  );
  expect(enHome).toContain('https://github.com/guangzan/electron-rstack');
  expect(enHome).toMatch(/Get Started/);
  expect(enHome).not.toMatch(/WhoIsUsing|ToolStack/);
  expect(enHome).not.toMatch(/Discord|BlueSky|Awesome Rspack|ByteDance/);
  expect(enHome).not.toContain('Trusted By Innovators');

  // Why
  expect(enHome).toContain('Fast builds');
  expect(enHome).toContain('Fast HMR');
  expect(enHome).toContain('Framework agnostic');
  expect(enHome).toContain('Webpack compatible');
  expect(enHome).toContain(
    'Rust-based parallel compilation keeps rebuilds short.',
  );

  // Fully Featured
  expect(enHome).toContain('What you get from Rspack');
  expect(enHome).toContain('Code Splitting');
  expect(enHome).toContain('Tree Shaking');
  expect(enHome).toContain('Multipage');
  expect(enHome).toContain('JavaScript API');
  // Benchmark
  expect(enHome).toContain('Build speed');
  expect(enHome).toContain('Rspack');
  expect(enHome).toContain('Vite');
  expect(enHome).toContain('webpack');
  expect(enHome).toContain(
    'https://github.com/rstackjs/build-tools-performance',
  );
  expect(enHome).toMatch(/See benchmark details/);

  // Footer
  expect(enHome).toMatch(/>Guide</);
  expect(enHome).toMatch(/>API</);
  expect(enHome).toMatch(/>Toolchain</);
  expect(enHome).toMatch(/>Community</);
  expect(enHome).toContain('https://rsbuild.rs/');
  expect(enHome).toContain('https://rslib.rs/');
  expect(enHome).toContain('https://rspress.rs/');
  expect(enHome).toContain('https://rsdoctor.rs/');
  expect(enHome).toContain('https://rstest.rs/');
  expect(enHome).toMatch(/href="[^"]*\/guide\/getting-started"/);
  expect(enHome).not.toMatch(/href="[^"]*\/guide\/concepts"/);
  expect(enHome).toMatch(/href="[^"]*\/config\/"/);
  expect(enHome).toMatch(/href="[^"]*\/api\/cli"/);
  expect(enHome).toMatch(/href="[^"]*\/api\/javascript-api"/);
  expect(enHome).not.toMatch(
    /href="[^"]*\/(config\/configuration|api\/api|guide\/cli)"/,
  );
  expect(enHome).not.toMatch(/href="[^"]*\/guide\/start\//);
  expect(enHome).toMatch(/MIT license/);
  expect(enHome).toContain('© guangzan and Rselectron contributors.');

  expect(zhHome).toContain('Rselectron');
  expect(zhHome).toContain('基于 Rspack 的 Electron 工具');
  expect(zhHome).toContain(
    '用 Rsbuild / Rspack 做 Electron 的开发与源码构建。',
  );
  expect(zhHome).toContain('https://github.com/guangzan/electron-rstack');
  expect(zhHome).toMatch(/快速开始/);
  expect(zhHome).not.toMatch(/WhoIsUsing|ToolStack/);
  expect(zhHome).not.toMatch(/Discord|BlueSky|Awesome Rspack|ByteDance/);

  expect(zhHome).toContain('构建快');
  expect(zhHome).toContain('HMR 快');
  expect(zhHome).toContain('框架无关');
  expect(zhHome).toContain('兼容 webpack');
  expect(zhHome).toContain('来自 Rspack 的能力');
  expect(zhHome).toContain('构建速度');
  expect(zhHome).toContain('Rspack');
  expect(zhHome).toContain('Vite');
  expect(zhHome).toContain('webpack');
  expect(zhHome).toContain(
    'https://github.com/rstackjs/build-tools-performance',
  );
  expect(zhHome).toMatch(/查看 Benchmark 详情/);
  expect(zhHome).toMatch(/>指南</);
  expect(zhHome).toMatch(/>工具链</);
  expect(zhHome).toMatch(/>社区</);
  expect(zhHome).toMatch(/href="[^"]*\/zh\/guide\/getting-started"/);
  expect(zhHome).not.toMatch(/href="[^"]*\/zh\/guide\/concepts"/);
  expect(zhHome).toMatch(/href="[^"]*\/zh\/config\/"/);
  expect(zhHome).toMatch(/href="[^"]*\/zh\/api\/cli"/);
  expect(zhHome).toMatch(/href="[^"]*\/zh\/api\/javascript-api"/);
  expect(zhHome).not.toMatch(
    /href="[^"]*\/zh\/(config\/configuration|api\/api|guide\/cli)"/,
  );
  expect(zhHome).toMatch(/>API</);
  expect(zhHome).toContain('基于 MIT 许可证');
  expect(zhHome).toContain('© guangzan 与 Rselectron 贡献者。');
  // Why: only compatibility maps to a local doc; others must not invent rspack paths.
  const whySource = readFileSync(
    join(websiteRoot, 'theme/components/Landingpage/WhyRspack/index.tsx'),
    'utf8',
  );
  expect(whySource).toContain('/guide/compatibility');
  expect(whySource).not.toContain('/guide/start/introduction');
  expect(whySource).not.toContain('rspack.rs');

  const fullySource = readFileSync(
    join(websiteRoot, 'theme/components/Landingpage/FullyFeatured/index.tsx'),
    'utf8',
  );
  expect(fullySource).not.toMatch(/tUrl\(/);
  expect(fullySource).not.toContain('rspack.rs');

  // doc-ui Hero CTA is onClick (no href in SSR HTML); locale path lives in theme.
  const heroSource = readFileSync(
    join(websiteRoot, 'theme/components/Landingpage/Hero/index.tsx'),
    'utf8',
  );
  expect(heroSource).toContain('/guide/getting-started');
  expect(heroSource).toContain('useI18nUrl');

  const landingSource = readFileSync(
    join(websiteRoot, 'theme/components/Landingpage/index.tsx'),
    'utf8',
  );
  expect(landingSource).not.toMatch(/ToolStack|WhoIsUsing/);
});
