import * as path from 'node:path';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { defineConfig } from '@rspress/core';
import { pluginSitemap } from '@rspress/plugin-sitemap';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';

const PUBLISH_URL = 'https://guangzan.github.io/Rselectron';
const description =
  'Rsbuild-first Electron development and source-build tooling.';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'Rselectron',
  description,
  lang: 'en',
  siteOrigin: 'https://guangzan.github.io',
  base: '/Rselectron/',
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
      description: '用 Rsbuild 做 Electron 开发与源码构建。',
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
      }),
    ],
    source: {
      preEntry: ['./theme/tailwind.css', './theme/styles/brand.css'],
    },
  },
});
