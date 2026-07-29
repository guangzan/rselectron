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
 * Frozen at Rselectron 1.0.0-rc.0 against Electron's three stable majors on
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

export function electronRspackTarget(
  major: number,
  role: 'main' | 'preload' | 'renderer',
): string {
  return `electron${major}-${role}`;
}
