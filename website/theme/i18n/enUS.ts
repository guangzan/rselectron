export const EN_US = {
  // hero
  heroSlogan: 'Electron tooling on Rspack',
  heroSubSlogan:
    'Develop and source-build Electron apps with Rsbuild and Rspack.',
  getStarted: 'Get Started',

  // whyRspack
  FastStartup: 'Fast builds',
  FastStartupDesc: 'Rust-based parallel compilation keeps rebuilds short.',
  LightningHMR: 'Fast HMR',
  LightningHMRDesc: 'Incremental builds keep renderer hot updates quick.',
  FrameworkAgnostic: 'Framework agnostic',
  FrameworkAgnosticDesc:
    'Use whatever UI framework your Rsbuild setup supports.',
  WebpackCompatible: 'Webpack compatible',
  WebpackCompatibleDesc:
    'Works with most webpack plugins and loaders from the community.',

  // benchmark
  benchmarkTitle: 'Build speed',
  benchmarkDesc:
    'Numbers from the Rspack vs Vite vs webpack comparison (seconds).',
  benchmarkDetail: 'See benchmark details',

  // fully featured
  fullyFeaturedTitle: 'What you get from Rspack',
  fullyFeaturedDesc:
    'Rselectron sits on Rsbuild/Rspack, so these bundler capabilities come with it.',

  featureCodeSplitting:
    'Split code into smaller bundles for on-demand loading.',
  featureTreeShaking: 'Remove unused code from the final bundles.',
  featurePlugins: 'Rich plugin hooks; compatible with most webpack plugins.',
  featureMultipage: 'Render multiple pages through one Electron renderer role.',

  featureAssetManagement: 'Handle and optimize images, fonts, and stylesheets.',
  featureLoaders:
    'Compatible with webpack loaders from the existing ecosystem.',
  featureHmr: 'Update modules at runtime without a full page refresh.',
  featureDevServer: 'Local development server for the renderer.',

  featureSwc: 'Rust-based SWC for JavaScript and TypeScript transpilation.',
  featureLightningCss: 'Lightning CSS for CSS processing and optimization.',
  featureParallelBuilds:
    'Run multiple builds in parallel for different targets or environments.',
  featureJavaScriptApi: 'Programmatic build API for custom pipelines.',

  // HomeFooter
  guide: 'Guide',
  quickStart: 'Quick Start',
  compatibility: 'Compatibility',
  migration: 'Migration',
  troubleshooting: 'Troubleshooting',
  cli: 'CLI',
  configuration: 'Configuration',
  apiReference: 'API',
  toolchain: 'Toolchain',
  community: 'Community',

  copyrightLicense:
    'Rselectron is free and open source software released under the MIT license.',
  copyrightOwner: '© guangzan and Rselectron contributors.',
} as const;
