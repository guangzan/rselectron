import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { RselectronError } from '../errors.ts';
import type {
  Diagnostic,
  Role,
  RoleConfig,
  RoleModuleFormat,
} from '../types.ts';

interface ApplicationManifest {
  main?: string;
}

/** Entry filename policy default when `output.filename` is unset. */
export function defaultEntryFilenamePattern(
  format: RoleModuleFormat,
  packageType: string | undefined,
): string {
  if (format === 'esm') {
    return '[name].mjs';
  }
  if (packageType === 'module') {
    return '[name].cjs';
  }
  return '[name].js';
}

export function explicitJsFilename(config: RoleConfig): string | undefined {
  const filenameConfig = config.output?.filename;
  if (typeof filenameConfig === 'string') {
    return filenameConfig;
  }
  if (
    typeof filenameConfig === 'object' &&
    filenameConfig !== null &&
    typeof filenameConfig.js === 'string'
  ) {
    return filenameConfig.js;
  }
  return undefined;
}

export function isDangerousEntryFilename(
  format: RoleModuleFormat,
  packageType: string | undefined,
  filename: string,
): boolean {
  if (!/\.js$/i.test(filename)) {
    return false;
  }
  return format === 'esm' || packageType === 'module';
}

export function entryFilenameRiskWarning(
  role: Role,
  filename: string,
): Diagnostic {
  return {
    code: 'RSELECTRON_ENTRY_FILENAME_RISK',
    message: `Explicit ${role} output.filename "${filename}" uses a .js extension that conflicts with the role module format / application "type". Electron may treat the file as ESM and fail on CommonJS globals, or vice versa.`,
    role,
  };
}

export function readApplicationManifest(
  appRoot: string,
  packageJson?: string,
): ApplicationManifest {
  const manifestPath = resolve(
    appRoot,
    packageJson === undefined ? 'package.json' : packageJson,
  );
  if (!existsSync(manifestPath)) {
    throw new RselectronError(
      'RSELECTRON_ELECTRON_ENTRY_MISSING',
      'electron',
      `Application manifest not found at ${manifestPath}.`,
      'Add a package.json with a main field, or set electron.packageJson.',
    );
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as ApplicationManifest;
}

export function resolveLaunchEntry(
  appRoot: string,
  configuredEntry: string | undefined,
  packageJson?: string,
): string {
  if (configuredEntry !== undefined) {
    return isAbsolute(configuredEntry)
      ? configuredEntry
      : resolve(appRoot, configuredEntry);
  }

  const manifest = readApplicationManifest(appRoot, packageJson);
  if (manifest.main === undefined || manifest.main.length === 0) {
    throw new RselectronError(
      'RSELECTRON_ELECTRON_ENTRY_MISSING',
      'electron',
      'Application manifest does not declare a main entry.',
      'Set package.json#main to the Main Role output entry.',
    );
  }

  return isAbsolute(manifest.main)
    ? manifest.main
    : resolve(appRoot, manifest.main);
}

export function plannedMainEntry(
  appRoot: string,
  mainConfig: RoleConfig,
): string | undefined {
  const entry = mainConfig.source?.entry;
  if (
    entry === undefined ||
    typeof entry === 'string' ||
    Array.isArray(entry)
  ) {
    return undefined;
  }
  const first = Object.keys(entry)[0];
  if (first === undefined) {
    return undefined;
  }
  const distRoot =
    typeof mainConfig.output?.distPath === 'string'
      ? mainConfig.output.distPath
      : (mainConfig.output?.distPath?.root ?? 'dist');
  const filename = explicitJsFilename(mainConfig) ?? '[name].js';
  const resolvedName = filename.replace('[name]', first);
  const absoluteDist = isAbsolute(distRoot)
    ? distRoot
    : resolve(mainConfig.root ?? appRoot, distRoot);
  return resolve(absoluteDist, resolvedName);
}

export function entryMismatchDiagnostic(
  appRoot: string,
  launchEntry: string,
  planned: string,
): Diagnostic {
  return {
    code: 'RSELECTRON_ELECTRON_ENTRY_MISMATCH',
    message: `Launch entry ${relative(appRoot, launchEntry) || launchEntry} does not match planned Main output ${relative(appRoot, planned) || planned}.`,
    role: 'main',
  };
}

export function assertEntryMatchesMain(
  appRoot: string,
  launchEntry: string,
  planned: string | undefined,
): void {
  if (planned === undefined) {
    return;
  }
  if (resolve(launchEntry) !== resolve(planned)) {
    const diagnostic = entryMismatchDiagnostic(appRoot, launchEntry, planned);
    throw new RselectronError(
      diagnostic.code,
      'electron',
      diagnostic.message,
      'Align package.json#main or electron.entry with the Main Role output path.',
    );
  }
}

export function maybeEntryMismatchWarning(
  appRoot: string,
  launchEntry: string | undefined,
  planned: string | undefined,
): Diagnostic | undefined {
  if (launchEntry === undefined || planned === undefined) {
    return undefined;
  }
  if (resolve(launchEntry) === resolve(planned)) {
    return undefined;
  }
  return entryMismatchDiagnostic(appRoot, launchEntry, planned);
}
