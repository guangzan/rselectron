export { build } from './build.ts';
export { defineConfig } from './config.ts';
export { createServer } from './dev.ts';
export {
  envPrefixesForRole,
  loadEnv,
  mergeRsbuildConfig,
  mergeRselectronConfig,
  RSELECTRON_ENV_PREFIXES,
} from './env.ts';
export { resolveProjectElectron } from './electron/resolve.ts';
export { ELECTRON_SUPPORT_SNAPSHOT } from './electron/snapshot.ts';
export { RselectronError } from './errors.ts';
export { inspect, redactSensitive } from './inspect.ts';
export { preview } from './preview.ts';
export type {
  ApplicationElectronConfig,
  BuildOptions,
  BuildResult,
  BuildRuntimeInfo,
  ConfigContext,
  Diagnostic,
  RoleModuleFormat,
  RselectronConfig,
  RselectronConfigExport,
  Role,
  RoleBuildResult,
  RoleConfig,
  RoleElectronConfig,
} from './types.ts';
export type {
  CreateServerOptions,
  CreateServerResult,
  WatchSelection,
} from './dev.ts';
export type { ProjectElectron } from './electron/resolve.ts';
export type {
  ElectronMajorSupport,
  ElectronSupportSnapshot,
} from './electron/snapshot.ts';
export type { LoadEnvOptions, LoadEnvResult } from './env.ts';
export type {
  InspectOptions,
  InspectResult,
  RoleInspectResult,
} from './inspect.ts';
export type { PreviewOptions, PreviewResult } from './preview.ts';

export function getVersion(): string {
  return RSELECTRON_VERSION;
}
