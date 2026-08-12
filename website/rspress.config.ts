import * as path from 'node:path';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { defineConfig } from '@rspress/core';
import { pluginSitemap } from '@rspress/plugin-sitemap';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';

const PUBLISH_URL = 'https://guangzan.github.io/rselectron';
const SITE_ORIGIN = 'https://guangzan.github.io';
const BASE = '/rselectron/';
const description =
  'Rspack-first Electron development and source-build tooling.';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'Rselectron',
  description,
  lang: 'en',
  siteOrigin: SITE_ORIGIN,
  base: BASE,
  route: {
    cleanUrls: true,
  },
  head: [
    // Per-page canonical, aligned with the sitemap's directory-style URLs.
    (route) => [
      'link',
      {
        rel: 'canonical',
        href: `${SITE_ORIGIN}${BASE.replace(/\/$/, '')}${route.routePath}`,
      },
    ],
    // Homepage structured data only (SoftwareApplication).
    (route) => {
      if (route.routePath !== '/') {
        return undefined;
      }
      return `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Rselectron',
        description,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'macOS, Windows, Linux',
        url: `${PUBLISH_URL}/`,
        softwareVersion: '1.0.0-beta.12',
        license: 'https://github.com/guangzan/rselectron/blob/main/LICENSE',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      })}</script>`;
    },
  ],
  llms: true,
  logo: {
    light: '/navbar-logo-light.png',
    dark: '/navbar-logo-dark.png',
  },
  icon: '/favicon-128x128.png',
  locales: [
    {
      lang: 'en',
      label: 'English',
      title: 'Rselectron',
      description,
    },
    {
      lang: 'zh',
      label: '简体中文',
      title: 'Rselectron',
      description: '用 Rspack 做 Electron 开发与源码构建。',
    },
  ],
  plugins: [
    pluginSitemap({
      siteUrl: `${PUBLISH_URL}/`,
    }),
  ],
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/guangzan/rselectron',
      },
    ],
    editLink: {
      docRepoBaseUrl:
        'https://github.com/guangzan/rselectron/tree/main/website/docs',
    },
  },
  builderConfig: {
    plugins: [
      pluginSass(),
      pluginTailwindcss(),
      pluginOpenGraph({
        title: 'Rselectron',
        type: 'website',
        url: `${PUBLISH_URL}/`,
        description,
        image: `${PUBLISH_URL}/rselectron-banner.png`,
        twitter: {
          card: 'summary_large_image',
        },
      }),
    ],
    source: {
      preEntry: ['./theme/tailwind.css', './theme/styles/brand.css'],
    },
  },
});
