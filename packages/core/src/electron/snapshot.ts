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
 * Frozen against Electron's support window on 2026-08-07: floor major 28 (the
 * first ESM-capable major) through the three stable majors current at release
 * time (43). The window does not drift after publication; the top rolls only
 * at the next release. Targets use each major's first stable release metadata.
 */
export const ELECTRON_SUPPORT_SNAPSHOT: ElectronSupportSnapshot = {
  byMajor: {
    28: {
      chrome: '120.0.6099.56',
      esm: true,
      firstStable: '28.0.0',
      node: '18.18.2',
    },
    29: {
      chrome: '122.0.6261.39',
      esm: true,
      firstStable: '29.0.0',
      node: '20.9.0',
    },
    30: {
      chrome: '124.0.6367.49',
      esm: true,
      firstStable: '30.0.0',
      node: '20.11.1',
    },
    31: {
      chrome: '126.0.6478.36',
      esm: true,
      firstStable: '31.0.0',
      node: '20.14.0',
    },
    32: {
      chrome: '128.0.6613.36',
      esm: true,
      firstStable: '32.0.0',
      node: '20.16.0',
    },
    33: {
      chrome: '130.0.6723.44',
      esm: true,
      firstStable: '33.0.0',
      node: '20.18.0',
    },
    34: {
      chrome: '132.0.6834.83',
      esm: true,
      firstStable: '34.0.0',
      node: '20.18.1',
    },
    35: {
      chrome: '134.0.6998.44',
      esm: true,
      firstStable: '35.0.0',
      node: '22.14.0',
    },
    36: {
      chrome: '136.0.7103.48',
      esm: true,
      firstStable: '36.0.0',
      node: '22.14.0',
    },
    37: {
      chrome: '138.0.7204.35',
      esm: true,
      firstStable: '37.0.0',
      node: '22.16.0',
    },
    38: {
      chrome: '140.0.7339.41',
      esm: true,
      firstStable: '38.0.0',
      node: '22.18.0',
    },
    39: {
      chrome: '142.0.7444.52',
      esm: true,
      firstStable: '39.0.0',
      node: '22.20.0',
    },
    40: {
      chrome: '144.0.7559.60',
      esm: true,
      firstStable: '40.0.0',
      node: '24.11.1',
    },
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
  majors: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
  peerRange: '>=28 <44',
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
