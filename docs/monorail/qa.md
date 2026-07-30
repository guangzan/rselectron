# Rselectron `grill-me` 问答记录

本文记录第一轮 `grill-me` 中提出的全部问题及最终选择；范围截止于用户要求调用 `grill-with-docs`。被后续讨论覆盖的答案会明确标注。

## 1. 对齐边界

**问题：** 你说“功能对齐 electron-vite”，是否要求现有 electron-vite 项目几乎无改动迁移到 rselectron？

**答案：** 能力对齐，但采用 Rspack 原生配置/API。

## 2. 底层抽象

**问题：** rselectron 应把哪一层作为用户可感知、项目自身长期维护的核心抽象？

**答案：** Rsbuild-first：以 environments 编排三类进程，并开放 `tools.rspack` 逃生口。

> 后续经过深入讨论，保留 Rsbuild-first，但不再以单个 environments/MultiCompiler 编排三个角色；改为每个角色使用独立 Rsbuild 实例。

## 3. 首个里程碑

**问题：** “功能对齐 electron-vite”是首个可发布版本的硬门槛，还是项目的长期终点？

**答案：** 完整功能对齐后才首次发布。

## 4. 发布语义

**问题：** 是否愿意把“首次发布”限定为 1.0/stable，而在功能未齐时发布 0.x alpha/canary 供实际项目验证？

**答案：** 可以：功能对齐是 1.0 门槛，之前允许 alpha/canary。

## 5. 配置模型

**问题：** 既然不追求 electron-vite 配置兼容，用户配置应以什么为中心？

**答案：** Rsbuild 与 Vite 配置几乎是兼容的，所以配置设计应该也尽量对齐 electron-vite，接受不 100% 对齐。

## 6. 配置对齐方式

**问题：** 是否采用 `defineConfig({ main, preload, renderer })`，其中每块是 Rsbuild 配置，并仅在合理处沿用 electron-vite 的 Electron 专用字段名？

**答案：** 确定：外层结构与 Electron 专用字段尽量对齐，内层遵循 Rsbuild。

## 7. 生态对齐边界

**问题：** 1.0 的“完整功能对齐”是否明确排除 Vite 插件兼容，只保证等价的核心能力，并依赖 Rsbuild/Rspack 插件生态？

**答案：** 是：不兼容 Vite 插件；核心能力等价，框架支持以 Rsbuild 生态为准。

## 8. 多窗口模型

**问题：** 多窗口/多页面要不要成为 rselectron 的一等概念？

**答案：** `renderer` 保持单个配置，多页面交给 Rsbuild HTML/multipage 能力。

## 9. 开发期刷新策略

**问题：** 是否对齐 electron-vite 的默认行为：main 重建后重启 Electron，preload 重建后 renderer 全页刷新，renderer 走 Rsbuild HMR？

**答案：** 按此策略实现。

## 10. Preview 语义

**问题：** Rsbuild 的 `preview` 通常启动静态服务器，但 Electron 工具中若沿用该语义会很容易误用。rselectron 的 `preview` 应如何定义？

**答案：** 对齐 electron-vite：默认先 build，再用生产产物启动 Electron；支持 `--skip-build`。

## 11. 构建边界

**问题：** `build` 是否只负责 main/preload/renderer 编译产物，还是还要生成 dmg/exe/AppImage 等安装包？

**答案：** 参考 electron-vite 的策略，即只负责源码构建，与 electron-builder/Forge 保持可组合。

## 12. 依赖外置策略

**问题：** main/preload 的依赖默认如何处理？

**答案：** 对齐 electron-vite：Electron、Node builtins 始终 external；`package.json` dependencies 默认 external，可 include/exclude。

## 13. Electron 兼容范围

**问题：** 1.0 要支持多老的 Electron？

**答案：** 支持发布时 Electron 官方仍维护的 major，并自动读取已安装版本推导 Node/Chrome target。

## 14. Rsbuild 依赖关系

**问题：** rselectron 应控制 Rsbuild 版本，还是让项目显式安装？

**答案：** 将 `@rsbuild/core` 作为 peerDependency，支持明确的 major 范围；用户可直接使用同一插件生态。

## 15. 扩展模型（初问）

**问题：** 仅接受 Rsbuild 插件无法覆盖 Electron spawn/restart、参数注入等编排生命周期。rselectron 是否在 1.0 提供自己的插件 API？

**答案：** 参考 electron-vite 的策略；后续提问应先列出 electron-vite 的策略。

## 16. 扩展模型（收敛）

**问题：** 是否按 electron-vite 的策略实现：1.0 不创建 Rselectron 专属插件协议，仅接受/导出 Rsbuild 插件；Electron 生命周期暂不开放？

**答案：** 是，按 electron-vite 策略实现。

## 17. 配置文件名

**问题：** rselectron 应采用哪种配置文件约定？

**答案：** 仅自动发现 `rselectron.config.*`，并支持 `--config`。

## 18. Inspect 命令

**问题：** rselectron 1.0 是否增加 `inspect`，输出最终 main/preload/renderer 的 Rsbuild/Rspack 配置？

**答案：** 增加；这是排查三环境配置合并问题的重要能力。

## 19. 脚手架范围

**问题：** Rselectron 仓库的 1.0 范围是否包含 `create-rselectron` 和框架模板？

**答案：** 核心先完成并验证；脚手架作为独立包/后续里程碑。

## 20. 资源导入 API

**问题：** rselectron 是否保留 electron-vite 的查询后缀名称与运行时语义，以降低迁移成本？

**答案：** 保留相同查询后缀与类型声明，底层改用 Rsbuild/Rspack 插件实现。

## 21. V8 Bytecode

**问题：** 1.0 是否把 bytecode 纳入功能对齐门槛？

**答案：** 明确不支持 bytecode，不计入功能对齐。

## 22. 装饰器支持

**问题：** rselectron 如何提供 decorator metadata 能力？

**答案：** 通过 Rsbuild/Rspack 原生 SWC 配置支持，不导出 electron-vite 风格的 `swcPlugin`。

## 23. 隔离入口

**问题：** rselectron 1.0 是否提供等价的 `build.isolatedEntries`？

**答案：** 重新设计为稳定的一等能力。

## 24. Electron 专属配置命名空间

**问题：** externalizeDeps、isolatedEntries 等专属能力放在哪里？

**答案：** 每个角色使用 `electron: { externalizeDeps, isolatedEntries }`，Rsbuild 配置保持原生。

## 25. 模块格式推导

**问题：** rselectron 是否沿用自动推导，还是要求用户明确指定？

**答案：** 默认按 Electron 版本与 `package.json#type` 自动推导，允许显式覆盖并做兼容校验。

## 26. 环境变量前缀

**问题：** rselectron 的默认 env 前缀采用哪套？

**答案：** 使用 `RSELECTRON_`、`MAIN_RSELECTRON_`、`PRELOAD_RSELECTRON_`、`RENDERER_RSELECTRON_`。

## 27. Renderer 开发地址变量

**问题：** rselectron 应暴露哪个运行时变量？

**答案：** 仅使用 `RSELECTRON_RENDERER_URL`，并提供类型声明。

## 28. 构建并发

**问题：** rselectron 默认如何编排三环境？

**答案：** 并行编译；dev 仅在 main/preload 首次成功且 renderer server 就绪后启动 Electron。

## 29. Renderer 框架承诺

**问题：** 1.0 对 renderer 框架应作何承诺？

**答案：** 核心框架无关；官方验收覆盖 Vanilla、React，其余遵循 Rsbuild 插件兼容性。

## 30. 1.0 测试门槛

**问题：** 你愿意把哪一级测试矩阵设为 1.0 硬门槛？

**答案：** 单元/集成 + Vanilla/React E2E；macOS/Linux/Windows；最低与最新受支持 Electron。

## 31. Rselectron 自身包格式

**问题：** rselectron 1.0 自身如何发布？

**答案：** ESM-only；Node engines 跟随所支持 `@rsbuild/core` 的最低要求。

## 32. 仓库结构

**问题：** Rselectron 初始采用哪种结构？

**答案：** 立即拆成 core、CLI、plugins、create 等多个包。

> 后续收敛为内部多包、仅发布一个 `rselectron` facade。

## 33. 发布包边界

**问题：** 第一阶段采用哪组公开包？

**答案：** 只公开 `rselectron`，内部 workspace 多包但不单独发布。

## 34. 内部多包的目的

**问题：** 坚持内部 workspace 多包，主要想解决什么？

**答案：** 为未来把 core/plugin/create 独立发布做准备。

## 35. 编程 API

**问题：** rselectron 1.0 是否承诺等价的编程 API？

**答案：** 公开 `defineConfig`、`createServer`、`build`、`preview`、`loadEnv`、`mergeConfig`；CLI 只是薄适配层。

> 后续将含糊的 `mergeConfig` 收敛为 `mergeRselectronConfig` 与 `mergeRsbuildConfig`。

## 36. Electron 启动入口

**问题：** rselectron 应以什么作为启动入口的权威来源？

**答案：** 对齐 electron-vite：`package.json#main` 为默认，CLI/config 可显式覆盖并校验。

## 37. Electron 依赖

**问题：** rselectron 如何声明并解析 Electron？

**答案：** 要求项目安装 Electron；作为 peerDependency 范围声明，并解析项目本地实例。

> 在后续 `grill-with-docs` 中进一步收敛为 optional peer，避免 npm 自动安装。

## 38. Resources 目录职责

**问题：** rselectron 是否沿用 electron-vite 的 resources 边界？

**答案：** 默认 `resources`；构建阶段不整目录复制，资源打包交给 electron-builder/Forge。

## 39. Renderer-only 模式

**问题：** rselectron 是否保留 renderer-only 能力？

**答案：** 保留 `--renderer-only`，启动前校验 `package.json#main` 与必要 preload 产物存在。

## 40. Dev 默认监听（初次决定）

**问题：** rselectron 的 main/preload watch 默认值如何设计？

**答案：** 对齐 electron-vite：默认不监听，用户必须传 `--watch`。

## 41. Electron 退出后的 CLI 行为（初次决定）

**问题：** rselectron dev 中 Electron 子进程退出后如何处理？

**答案：** 正常退出则结束 CLI；非零退出保留 dev 服务，等待代码变更后重启。

> 此答案后来被“任何退出都结束 CLI”覆盖。

## 42. 崩溃恢复（初问）

**问题：** 未启用 watch 且 Electron 崩溃时，用户如何恢复？

**答案：** 暂不选择；要求先重新深入讨论 main/preload 默认监听还是默认不监听。

## 43. Dev 默认监听（重新确认）

**问题：** 基于 electron-vite Issue #7 的设计动机，最终采用哪种默认？

**答案：** main/preload 默认不监听；`--watch` 开启，并支持细粒度配置与重启防抖。

## 44. 崩溃恢复（最终决定）

**问题：** Electron 非零退出后，Rselectron 应如何恢复？

**答案：** 对齐 electron-vite，任何 Electron 退出都结束 CLI。

## 45. 配置热重载

**问题：** 开发期间修改 `rselectron.config.*` 后如何处理？

**答案：** 检测变更，完整重建编译器/dev server/Electron，并打印重启原因。

## 46. 目录约定

**问题：** rselectron 是否沿用 electron-vite 的默认入口与输出目录？

**答案：** 全部沿用，降低迁移与认知成本。

## 47. 角色必选性

**问题：** rselectron 如何校验缺失角色？

**答案：** 对齐 electron-vite：任一角色缺失均 warning，可忽略。

## 48. 配置函数上下文

**问题：** rselectron 的配置函数上下文如何设计？

**答案：** 保留 `command`/`mode`，并让 command 精确为 `dev`/`build`/`preview`/`inspect`。

## 49. 包管理器

**问题：** Rselectron 仓库统一使用哪个包管理器？

**答案：** 仅 pnpm。

## 50. 项目自身构建

**问题：** Rselectron 各内部包与最终 npm 包用什么构建？

**答案：** 使用 Rslib 构建 ESM 与类型声明。

## 51. 测试工具链

**问题：** 采用哪套测试工具？

**答案：** Rstest + Playwright Electron。

## 52. 版本与发布

**问题：** 采用哪种发布管理方式？

**答案：** Changesets + GitHub Actions，支持 alpha/canary 与 npm provenance。

## 53. 许可证

**问题：** Rselectron 采用哪种开源许可证？

**答案：** MIT。

## 54. 文档形态

**问题：** 1.0 文档如何交付？

**答案：** 仓库内 Rspress 文档站 + API reference + electron-vite 迁移指南。

## 55. 示例与 Fixture

**问题：** 官方示例与 E2E fixture 如何组织？

**答案：** examples 与 `tests/fixtures` 完全分离。

## 56. Rsbuild 实例编排（初次决定）

**问题：** rselectron 如何组织 Rsbuild 实例？

**答案：** dev 中 main/preload build 实例与 renderer dev-server 实例分离；production 使用单个三环境实例并行构建。

> 后续因完整 Rsbuild 配置与 EnvironmentConfig 限制冲突，被“三个独立实例”覆盖。

## 57. 共享配置

**问题：** rselectron 是否增加顶层 shared 配置？

**答案：** 不增加；导出 merge API，由用户显式组合。

## 58. `createServer` 返回值

**问题：** rselectron 的 `createServer()` 返回什么？

**答案：** 返回 `RselectronDevServer`，至少提供 `urls`、`electronProcess`、`close()`。

## 59. `build` 返回值

**问题：** rselectron 的 `build()` 是否返回结构化结果？

**答案：** 返回按 main/preload/renderer 分组的 stats、产物路径、`close()`。

## 60. `preview` 返回值

**问题：** `preview()` 应返回什么？

**答案：** 返回含 `buildResult`、`electronProcess`、`close()` 的 `PreviewHandle`。

## 61. 配置完整性与 MultiCompiler

**问题：** “每角色完整 Rsbuild 配置”与“单 MultiCompiler”哪个目标优先？

**答案：** 委托助手仔细权衡并决定。

**最终决定：** 每角色完整 Rsbuild 配置 + 三个独立 Rsbuild 实例；build 并行，撤销单 MultiCompiler 决定。

## 62. 细粒度 Watch 配置

**问题：** 细粒度 watch 配置放在哪里？

**答案：** 各角色使用 `electron.watch`；CLI `--watch[=main,preload]` 作为覆盖。

## 63. Preset 覆盖规则

**问题：** rselectron 如何处理用户覆盖？

**答案：** 默认值可覆盖；对 main/preload 的 target、format、entry 和强制 externals 做硬校验。

## 64. Sandbox Preload 联动

**问题：** 启用 preload isolatedEntries 时，externalizeDeps 如何处理？

**答案：** 若用户未显式配置，则自动设为 false；若显式 externalize 则 warning。

## 65. 应用根目录

**问题：** rselectron 如何确定 Electron 应用的 `package.json`？

**答案：** CLI `[root]`/API root 为应用根，读取该目录 `package.json`；另允许 `electron.packageJson` 覆盖。

## 66. 配置加载器

**问题：** rselectron 如何加载 `rselectron.config.*`？

**答案：** 复用 Rsbuild `loadConfig`，默认 auto，并支持 `--config-loader` 覆盖。

## 67. Inspect 输出

**问题：** `rselectron inspect` 默认生成哪些内容？

**答案：** 归一化 Rselectron 配置 + 各角色最终 Rsbuild 配置 + Rspack 配置，并隐藏敏感 env 值。

## 68. 内部包拓扑

**问题：** 初始 workspace 采用哪种内部拓扑？

**答案：** `packages/core`（私有）+ `packages/cli`（私有）+ `packages/rselectron`（唯一发布 facade/bin）。

## 69. Rsbuild 版本范围

**问题：** Rselectron 1.0 支持哪些 `@rsbuild/core` major？

**答案：** 仅支持 Rsbuild 2.x，并在 peerDependency 中限制。

## 70. Renderer 安全目标

**问题：** rselectron 对 renderer 的默认与支持边界是什么？

**答案：** 默认并官方支持 web/Chrome target；允许高级覆盖但警告 nodeIntegration 风险。

## 71. Main/Preload 优化默认值

**问题：** rselectron 是否沿用 main/preload 默认不 minify、renderer 正常优化的策略？

**答案：** main/preload 默认不 minify，允许用户开启；renderer 正常优化。

## 72. 输出命名

**问题：** rselectron 默认输出命名如何设置？

**答案：** main/preload 使用稳定 entry 名 + hashed chunks/assets；renderer 正常 hash。

## 73. 类型声明入口

**问题：** rselectron 如何暴露用户代码类型？

**答案：** 提供 `rselectron/node` 类型子路径，并在迁移文档中说明替换。

## 74. 性能承诺

**问题：** 1.0 如何定义性能目标？

**答案：** 建立与 electron-vite 的同 fixture benchmark，要求不出现显著回退；发布实测数据但暂不承诺固定倍率。

## 75. Production Watch

**问题：** rselectron 是否支持 `build --watch`？

**答案：** 不支持；build 强制有限执行，持续监听只放在 dev。

## 76. 应用级 Electron 配置

**问题：** 是否增加顶层 `electron` 配置？

**答案：** 增加：`packageJson`、`entry`、`execPath`、`args`、`restartDebounce` 等；CLI/API inline options 优先覆盖。

## 77. Dev 初次构建失败

**问题：** dev 初次构建失败时采用哪种失败策略？

**答案：** 无 watch 时关闭资源并退出；有 watch 时保持服务，首次全部成功后再启动 Electron。

## 78. Watch 重建失败

**问题：** rselectron 是否沿用“失败保留旧应用，下一次成功再应用更新”？

**答案：** 先要求分析 electron-vite 策略的优缺点并给出指导。

**最终确认：** 采用 `keep-last-good`；构建错误时禁止写出部分产物，仅完整成功后重启或 full reload，并明确标记当前运行的是 last-known-good。

## 79. 用户项目包管理器

**问题：** “仅 pnpm”是否只约束 Rselectron 仓库贡献，还是也限制使用 Rselectron 的 Electron 项目？

**答案：** 仅仓库开发必须 pnpm；发布包兼容 npm/pnpm/Yarn/Bun 项目。

## 80. 操作系统支持

**问题：** Rselectron 1.0 正式支持哪些系统？

**答案：** macOS、Windows、Linux 均为正式支持平台。

## 81. CPU 架构支持

**问题：** Rselectron 的架构承诺是什么？

**答案：** 支持 Electron 在三平台提供的 x64/arm64 主机架构；不承诺交叉编译 native addon。

## 82. 遥测

**问题：** Rselectron 是否收集匿名使用数据？

**答案：** 不收集遥测。

## 83. 错误模型

**问题：** 1.0 是否定义结构化错误？

**答案：** 公开 `RselectronError`（code、role、cause、hint）；CLI 再格式化展示。

## 84. 功能对齐基线

**问题：** 1.0 的对齐基线如何定义？

**答案：** 冻结 electron-vite 6.0.0 正式版；若尚未发布则暂以 beta.1 建矩阵，正式版发布后只做一次差异审查。

## 85. 配置合并 API

**问题：** 如何设计配置合并函数？

**答案：** 提供 `mergeRselectronConfig` 与 `mergeRsbuildConfig`；不导出含糊的 `mergeConfig`。

## 86. `loadEnv` API

**问题：** rselectron 的 `loadEnv` 采用哪种接口？

**答案：** 采用 options 对象并返回 Rsbuild 风格完整结果，默认四个 RSELECTRON 前缀。

## 87. Mode 语义

**问题：** rselectron 的 `--mode` 如何定义？

**答案：** 完全采用 Rsbuild：`--mode` 仅 `development`/`production`/`none`，另加 `--env-mode`。

## 88. 配置上下文中的 EnvMode

**问题：** 配置函数上下文是否增加独立 `envMode`？

**答案：** 使用 `{ command, mode, envMode }`，三者语义明确。

## 89. CLI 选项命名

**问题：** Rselectron 的多词 CLI flags 采用什么规范？

**答案：** 只支持 kebab-case，不提供迁移别名。

## 90. 默认命令

**问题：** Rselectron 是否允许直接 `rselectron [root]` 启动 dev？

**答案：** 必须显式写 `dev` 子命令。

## 91. 模块格式覆盖入口

**问题：** main/preload 的显式格式覆盖放在哪里？

**答案：** 使用 `electron.format: 'auto' | 'cjs' | 'esm'`，由 preset 映射到底层配置。

## 92. `package.json#main` 一致性

**问题：** `package.json#main` 与 main 输出不一致时如何处理？

**答案：** dev/preview 在启动前报结构化错误并给出预期路径；build 输出 warning。

## 93. 文档语言

**问题：** Rselectron 1.0 文档语言范围是什么？

**答案：** 所有文档完整中英双语。

## 94. 代码质量工具

**问题：** 仓库采用哪套 lint/format？

**答案：** Rslint + Prettier，锁定版本并在升级时验证。

## 95. 最终确认

**问题：** 以上是否准确表达你要构建的 Rselectron？

**答案：** 调用 `grill-with-docs`，将已经确认的需求与决策直接沉淀为 ADR。
