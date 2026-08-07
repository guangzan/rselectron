# Rselectron Domain Context（中文）

本文是 [`CONTEXT.md`](./CONTEXT.md) 的简体中文等价文档。

## 产品

**Rselectron**  
面向 Electron 应用、以 Rsbuild 为优先的开发与源码构建协调工具。它不是 Vite 兼容层、应用打包器，也不是项目脚手架。

**能力基线（Capability baseline）**  
用于构建兼容性矩阵的、已冻结的 electron-vite 发布版本。目标为 electron-vite 6.0.0；在该版本出现前，以 6.0.0-beta.1 作为临时基线。

**能力对等（Capability parity）**  
在兼容性矩阵适用条目上的覆盖，并受已文档化对等例外约束。并不意味着与 electron-vite 在 API、配置、插件或实现上兼容。

**对等例外（Parity exception）**  
Rselectron 有意排除的基线能力。Vite 插件、字节码编译，以及 electron-vite 导出的 SWC helper 属于对等例外。

**兼容性矩阵（Compatibility matrix）**  
将基线中每项能力映射为 Rselectron 支持、已文档化例外或延期里程碑的验收记录。

## 应用模型

**Application root（应用根目录）**  
解析 Electron 应用源码位置、输出位置与默认包清单的基准目录。

**Application manifest（应用清单）**  
描述 Electron 应用的包清单。默认是应用根目录下的 `package.json`；应用也可选择其他清单。

**Electron entry（Electron 入口）**  
开发或 preview 时用于启动 Electron 的可执行应用入口。除非显式覆盖，应用清单的 `main` 字段具有权威性。

**Project-local Electron（项目本地 Electron）**  
从应用根目录选出的 Electron 安装。它是启动应用、并在需要时推导源码构建目标的权威来源。

**Role（角色）**  
三项独立配置的源码构建职责之一：Main、Preload 或 Renderer。

**Main role**  
为 Electron 主进程产出代码的角色。

**Preload role**  
产出由 renderer web contents 作为 preload 脚本加载的代码的角色。

**Renderer role**  
服务或产出面向浏览器的 renderer 内容的角色。多个页面属于这一个角色；窗口与页面不是独立的 Rselectron 领域对象。

**Role configuration（角色配置）**  
某一角色的完整 Rsbuild 配置，并扩展该角色由 Rselectron 拥有的 Electron 行为。

**Role preset（角色预设）**  
Rselectron 对某一角色的默认值与不变量。在安全处可覆盖预设，但角色身份约束仍被强制执行。未设置 `output.distPath` 时采用 Conventional role outputs 布局；其余预设（目标、格式、Node 入口命名）由各自契约拥有。

**Conventional role outputs（约定角色产物目录）**  
未设置 `output.distPath` 时的默认角色输出根：`out/main`、`out/preload`、`out/renderer`，相对 Application root 解析（不相对各 Role 的 `root`）。显式 `distPath`（字符串或带 `root` 的对象）始终优先。

**Role module format（角色模块格式）**  
Main 或 Preload 源码构建产物使用的模块系统：`cjs` 或 `esm`。由 Electron 能力、应用清单 `"type"` 与角色级 `electron.format` 推导，并通过 Rsbuild `output.module` 生效。

**Format-aware externalization（格式感知外置）**  
Main/Preload 依赖外置必须与角色模块格式一致的规则——ESM 使用 `module-import`（源自 `require` 的外置使用 `node-commonjs`），CJS 使用 CommonJS——而非总是强制 CommonJS `require`。

**Preferred ESM path（优先 ESM 路径）**  
在应用清单为 `"type": "module"`（且 Electron 支持 ESM）时，推荐的 Main/Preload 姿态：保持 `electron.format` 为 `auto`（推导 ESM），遵循 Entry filename policy，避免仅为绕过 import-only 包而钉死 `format: 'cjs'`，或依赖 `externalizeDeps.include` / bundler-ignore `import()`。

**Import-only external risk（Import-only 外置风险）**  
在 CJS Main/Preload 角色下，被 CommonJS 外置的请求（含包 subpath）若其解析到的入口/`exports` 没有可用的 `require`/`default`/`main` CJS 路径，而只有 `import` / `module` / `"type": "module"` 一类信号，则构建可能成功但运行时对该请求的 `require` 会失败。缓解顺序：优先 Preferred ESM path；若有意保留 CJS，再用 `externalizeDeps.include`（打进包）；bundler-ignore 原生 `import()` 仅作进阶脚注。

**Entry filename policy（入口文件名策略）**  
未设置 `output.filename` 时 Main/Preload 的默认无 hash 入口模式：ESM 为 `[name].mjs`，`"type": "module"` 下的 CJS 为 `[name].cjs`，否则为 `[name].js`。显式文件名优先；危险覆盖仅警告。

**On-demand ESM require shim（按需 ESM require shim）**  
仅当 ESM Main/Preload 产物仍含自由 `require(` / `require.resolve(` 时注入的薄 `createRequire(import.meta.url)`。不替代 Rspack 对 `__dirname` / `__filename` 的 `node-module` 处理。

**Application Electron options（应用级 Electron 选项）**  
由应用共享、而非由某一源码构建角色拥有的 Electron 启动与应用发现行为。

**Source build（源码构建）**  
将已配置角色编译为 Electron 可消费文件。源码构建不创建安装包或可分发应用包。

## 开发生命周期

**Development session（开发会话）**  
已配置角色构建器、renderer 开发服务器与 Electron 子进程的协调生命周期。

**Configuration generation（配置世代）**  
对 Rselectron 配置的一次求值，以及由此创建的协调角色实例。配置变更会替换整个世代。

**Role update（角色更新）**  
被监听的 Main 或 Preload 角色的一次成功重建。Main 更新会重启 Electron；Preload 更新会请求每个已连接 renderer 页面全量重载。

**Successful generation（成功世代）**  
某一角色完整且无错误、有资格成为活跃输出的输出世代。

**Last-known-good generation（最近已知良好世代）**  
某一角色最近一次成功世代。失败世代永远不会替换它。

**Renderer-only session（仅 Renderer 会话）**  
在服务 Renderer 角色的同时复用此前构建的 Main 与 Preload 输出的开发会话。会话开始前，必需的复用输出必须存在。

## 兼容与支持

**Supported Electron major（受支持 Electron major）**  
某一 Rselectron 发布版本的支持快照所包含的 Electron major。

**Electron support snapshot（Electron 支持快照）**  
某一 Rselectron 发布版本的冻结 Electron 支持窗口：下沿固定为 Electron 28（首个支持 ESM 的 major），上沿为发布时最新的三个稳定 major（随发布滚动）。该快照对该 Rselectron 版本保持固定。每个 major 记录用于推导编译目标的 Node 与 Chromium 版本字符串（取自其首稳定版）与 ESM 能力。快照外的版本以结构化不支持版本错误拒绝。

**Rsbuild tested window（Rsbuild 已测窗口）**  
某一 Rselectron 发布版本所测试的 `@rsbuild/core` 版本冻结范围：即该发布版开发依赖中所固定版本（例如测试 `2.1.7`，窗口为 `>=2.1.0 <2.2.0`）的 minor 线。已测 minor 线内的 patch 级更新视为安全、不产生诊断。项目本地的 `@rsbuild/core` 越窗时产生 warn 级结构化诊断，绝不会是硬错误——因为 `@rsbuild/core` 是应用拥有的必需项目 peer（构建工具）。这与 Electron support snapshot 形成对比：后者越窗版本被硬拒绝，因为 Rselectron 要从逐 major 运行时元数据推导编译目标。

**Derived compiler target（推导的编译目标）**
当 Role 未显式设置编译目标（`output.overrideBrowserslist` 或 `tools.rspack.target`）时填入的编译目标值。Main / Preload 得到 `tools.rspack.target: electron${N}-main` / `electron${N}-preload`。Renderer 得到 `output.overrideBrowserslist: ['chrome >= ${min(M, K)}']`，其中 `M` 为支持快照 Chromium major，`K` 为硬编码的 browserslist-rs 上限（今日为 **138**）——不是 `electron${N}-renderer`，也不是写在 `tools.rspack.target` 上的 Vite 式 `chrome${M}`。随后由 Rsbuild 组装 Rspack target（通常为 `['web', 'browserslist:…']`）。`M > K` 时静默 clamp；待 browserslist-rs 覆盖快照 Chromium 后移除 clamp。Rsbuild `output.target`（`web` / `node`）是环境预设，不抑制 Chromium browserslist 推导。

**Host support（宿主支持）**  
在 macOS、Linux 或 Windows 的 x64 或 arm64 宿主上运行 Rselectron。宿主支持并不意味着原生 addon 可交叉编译。

## 配置词汇

**Command（命令）**  
显式的 Rselectron 操作：Dev、Build、Preview 或 Inspect。

**Build mode（构建模式）**  
Rsbuild 的编译模式：Development、Production 或 None。

**Environment mode（环境模式）**  
独立选择的环境文件命名空间。它不选择构建模式。
