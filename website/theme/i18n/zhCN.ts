import type { EN_US } from './enUS';

export const ZH_CN: Record<keyof typeof EN_US, string> = {
  // hero
  heroSlogan: '基于 Rspack 的 Electron 工具',
  heroSubSlogan: '用 Rsbuild / Rspack 做 Electron 的开发与源码构建。',
  getStarted: '快速开始',

  // whyRspack
  FastStartup: '构建快',
  FastStartupDesc: 'Rust 并行编译，重建时间短。',
  LightningHMR: 'HMR 快',
  LightningHMRDesc: '增量构建，Renderer 热更新跟得上。',
  FrameworkAgnostic: '框架无关',
  FrameworkAgnosticDesc: '不绑死前端框架，Rsbuild 支持的都能用。',
  WebpackCompatible: '兼容 webpack',
  WebpackCompatibleDesc: '兼容社区里常见的 webpack 插件和 loader。',

  // benchmark
  benchmarkTitle: '构建速度',
  benchmarkDesc: '来自 Rspack / Vite / webpack 对比数据（单位：秒）。',
  benchmarkDetail: '查看 Benchmark 详情',

  // fully featured
  fullyFeaturedTitle: '来自 Rspack 的能力',
  fullyFeaturedDesc:
    'Rselectron 建立在 Rsbuild / Rspack 上，这些打包能力一并带上。',

  featureCodeSplitting: '把代码拆成更小的 bundle，按需加载。',
  featureTreeShaking: '去掉最终产物里用不到的代码。',
  featurePlugins: '插件钩子丰富，兼容大多数 webpack 插件。',
  featureMultipage: '在单一 Electron Renderer Role 中渲染多个页面。',

  featureAssetManagement: '处理并优化图片、字体和样式表。',
  featureLoaders: '兼容 webpack loader，沿用现有生态。',
  featureHmr: '运行时更新模块，不用整页刷新。',
  featureDevServer: '为 Renderer 提供本地开发服务器。',

  featureSwc: '用基于 Rust 的 SWC 转译 JavaScript / TypeScript。',
  featureLightningCss: '用 Lightning CSS 处理并优化 CSS。',
  featureParallelBuilds: '并发跑多个构建，面向不同目标或环境。',
  featureJavaScriptApi: '提供编程式构建 API，方便自定义流程。',

  // HomeFooter
  guide: '指南',
  quickStart: '快速开始',
  compatibility: '兼容性',
  migration: '迁移指南',
  troubleshooting: '故障排查',
  cli: 'CLI',
  configuration: '配置',
  apiReference: 'API',
  toolchain: '工具链',
  community: '社区',

  copyrightLicense: 'Rselectron 是基于 MIT 许可证发布的免费开源软件。',
  copyrightOwner: '© guangzan 与 Rselectron 贡献者。',
};
