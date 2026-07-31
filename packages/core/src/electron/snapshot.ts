export interface ElectronMajorSupport {
  chrome: string;
  esm: boolean;
  firstStable: string;
  node: string;
}

export interface ElectronSupportSnapshot {
  byMajor: Record<number, ElectronMajorSupport>;
  majors: readonly number[];
  peerRange: string;
}

/**
 * Frozen at Rselectron 1.0.0-beta.1 against Electron's three stable majors on
 * 2026-07-24. Targets use each major's first stable release metadata.
 */
export const ELECTRON_SUPPORT_SNAPSHOT: ElectronSupportSnapshot = {
  byMajor: {
    41: {
      chrome: '146.0.7680.65',
      esm: true,
      firstStable: '41.0.0',
      node: '24.14.0',
    },
    42: {
      chrome: '148.0.7778.96',
      esm: true,
      firstStable: '42.0.0',
      node: '24.15.0',
    },
    43: {
      chrome: '150.0.7871.46',
      esm: true,
      firstStable: '43.0.0',
      node: '24.17.0',
    },
  },
  majors: [41, 42, 43],
  peerRange: '>=41 <44',
};

export function getSupportedMajor(version: string): number | undefined {
  const major = Number.parseInt(version.split('.', 1)[0] ?? '', 10);
  if (!Number.isFinite(major)) {
    return undefined;
  }
  return ELECTRON_SUPPORT_SNAPSHOT.byMajor[major] === undefined
    ? undefined
    : major;
}

/**
 * Temporary browserslist-rs Chromium major ceiling for `@rspack/binding`.
 * `chrome >= 139` resolves empty and fails the build; snapshot Electron Chrome
 * is 146+. Remove the clamp after browserslist-rs covers those majors
 * (https://github.com/browserslist/browserslist-rs/issues/48).
 */
export const BROWSERSLIST_CHROME_MAJOR_CEILING = 138;

export function electronChromeBrowserslist(major: number): string {
  const chrome = ELECTRON_SUPPORT_SNAPSHOT.byMajor[major]?.chrome;
  if (chrome === undefined) {
    throw new Error(
      `No Electron support snapshot entry for major ${String(major)}.`,
    );
  }
  const chromeMajor = Number.parseInt(chrome.split('.', 1)[0] ?? '', 10);
  if (!Number.isFinite(chromeMajor)) {
    throw new Error(
      `Invalid Chromium version in Electron support snapshot for major ${String(major)}: ${chrome}`,
    );
  }
  const clamped = Math.min(chromeMajor, BROWSERSLIST_CHROME_MAJOR_CEILING);
  return `chrome >= ${String(clamped)}`;
}

export function electronRspackTarget(
  major: number,
  role: 'main' | 'preload' | 'renderer',
): string {
  return `electron${major}-${role}`;
}
