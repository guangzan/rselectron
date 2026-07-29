import type {
  BuildResult as RsbuildBuildResult,
  RsbuildConfig,
} from '@rsbuild/core';

export type Role = 'main' | 'preload' | 'renderer';
export type BuildMode = 'development' | 'none' | 'production';
export type ConfigLoader = 'auto' | 'jiti' | 'native';
export type RoleModuleFormat = 'cjs' | 'esm';

export interface RoleElectronConfig {
  externalizeDeps?:
    | boolean
    | {
        exclude?: string[];
        include?: string[];
      };
  format?: 'auto' | RoleModuleFormat;
  isolatedEntries?: boolean;
  watch?: boolean;
}

export type RoleConfig = RsbuildConfig & {
  electron?: RoleElectronConfig;
};

export interface ApplicationElectronConfig {
  args?: string[];
  entry?: string;
  execPath?: string;
  packageJson?: string;
}

export interface RselectronConfig {
  electron?: ApplicationElectronConfig;
  main?: RoleConfig;
  preload?: RoleConfig;
  renderer?: RoleConfig;
}

export interface ConfigContext {
  command: 'build' | 'dev' | 'inspect' | 'preview';
  envMode: string;
  mode: BuildMode;
}

export type RselectronConfigFunction = (
  context: ConfigContext,
) => Promise<RselectronConfig> | RselectronConfig;

export type RselectronConfigExport =
  Promise<RselectronConfig> | RselectronConfig | RselectronConfigFunction;

export interface BuildOptions {
  config?: RselectronConfigExport;
  configLoader?: ConfigLoader;
  configPath?: string;
  cwd?: string;
  envMode?: string;
  mode?: BuildMode;
  watch?: boolean;
}

export interface Diagnostic {
  code:
    | 'RSELECTRON_ELECTRON_ENTRY_MISMATCH'
    | 'RSELECTRON_PRELOAD_ISOLATION_EXTERNALIZE_CONFLICT'
    | 'RSELECTRON_RENDERER_NODE_INTEGRATION_RISK'
    | 'RSELECTRON_ROLE_MISSING';
  message: string;
  role: Role;
}

export interface RoleBuildResult {
  paths: string[];
  stats?: RsbuildBuildResult['stats'];
}

export interface BuildRuntimeInfo {
  electron?: {
    execPath: string;
    major: number;
    version: string;
  };
  formats: Partial<Record<Role, RoleModuleFormat>>;
  launchExecPath?: string;
  targets: Partial<Record<Role, string[]>>;
}

export interface BuildResult {
  close: () => Promise<void>;
  roles: Partial<Record<Role, RoleBuildResult>>;
  runtime?: BuildRuntimeInfo;
  warnings: Diagnostic[];
}
