import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RselectronError } from '../errors.ts';
import { getSupportedMajor } from './snapshot.ts';

export interface ProjectElectron {
  execPath: string;
  major: number;
  root: string;
  version: string;
}

export function resolveProjectElectron(appRoot: string): ProjectElectron {
  const applicationRoot = resolve(appRoot);
  const requireFromApp = createRequire(
    pathToFileURL(join(applicationRoot, 'package.json')).href,
  );

  let version: string;
  let execPath: string;
  let root: string;

  try {
    const packageJsonPath = requireFromApp.resolve('electron/package.json');
    root = dirname(packageJsonPath);
    version = (
      requireFromApp(packageJsonPath) as {
        version?: string;
      }
    ).version!;
    execPath = String(requireFromApp('electron'));
  } catch (cause) {
    throw new RselectronError(
      'RSELECTRON_ELECTRON_NOT_FOUND',
      'electron',
      cause,
      `Install electron in the application root (${applicationRoot}) or provide fully explicit Role targets and formats.`,
    );
  }

  const major = getSupportedMajor(version);
  if (major === undefined) {
    throw new RselectronError(
      'RSELECTRON_ELECTRON_UNSUPPORTED',
      'electron',
      `Electron ${version} is outside the frozen support snapshot.`,
      'Use one of the supported majors declared by this Rselectron release, or configure every runtime-dependent target and format explicitly.',
    );
  }

  return {
    execPath: resolve(execPath),
    major,
    root,
    version,
  };
}
