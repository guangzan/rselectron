import type { Role, RselectronConfig } from './types.ts';
import { RselectronError } from './errors.ts';

export type NodeWatchRole = 'main' | 'preload';
export type WatchSelection = boolean | NodeWatchRole | readonly NodeWatchRole[];

const nodeWatchRoles: readonly NodeWatchRole[] = ['main', 'preload'];

export function parseWatchSelection(value: string): WatchSelection {
  if (value.length === 0 || value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }

  const parts = value.split(',').map((part) => part.trim());
  if (parts.length === 0) {
    throw new RselectronError(
      'RSELECTRON_DEV_WATCH_INVALID',
      'orchestration',
      '`--watch` requires main, preload, or a comma-separated list of those Roles.',
    );
  }

  const roles: NodeWatchRole[] = [];
  for (const part of parts) {
    if (part !== 'main' && part !== 'preload') {
      throw new RselectronError(
        'RSELECTRON_DEV_WATCH_INVALID',
        'orchestration',
        `Unsupported --watch Role: ${part}.`,
        'Use --watch, --watch=main, --watch=preload, or --watch=main,preload.',
      );
    }
    if (!roles.includes(part)) {
      roles.push(part);
    }
  }
  return roles;
}

export function resolveWatchedRoles(
  selection: WatchSelection | undefined,
  config: RselectronConfig,
): Set<NodeWatchRole> {
  if (selection !== undefined) {
    if (selection === true) {
      return new Set(nodeWatchRoles);
    }
    if (selection === false) {
      return new Set();
    }
    if (selection === 'main' || selection === 'preload') {
      return new Set([selection]);
    }
    return new Set(selection);
  }

  const watched = new Set<NodeWatchRole>();
  for (const role of nodeWatchRoles) {
    if (config[role]?.electron?.watch === true) {
      watched.add(role);
    }
  }
  return watched;
}

export function isNodeWatchRole(role: Role): role is NodeWatchRole {
  return role === 'main' || role === 'preload';
}

export const MAIN_RESTART_DEBOUNCE_MS = 300;
