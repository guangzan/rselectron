import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { RsbuildConfig } from '@rsbuild/core';
import { RselectronError } from './errors.ts';
import type { Role, RoleConfig } from './types.ts';

export interface GenerationLayout {
  active: string;
  backup: string;
  journal: string;
  staging: string;
}

export type RenameFn = (from: string, to: string) => void;

export interface PromoteGenerationOptions {
  active: string;
  beforePromote?: () => Promise<void> | void;
  candidate: string;
  rename?: RenameFn;
  retries?: number;
  role: Role;
  validate?: (candidatePath: string) => boolean;
}

const DEFAULT_RETRIES = 5;
const RETRY_DELAY_MS = 50;

export function resolveGenerationLayout(
  activeDistRoot: string,
): GenerationLayout {
  const parent = dirname(activeDistRoot);
  const name = basename(activeDistRoot);
  const genRoot = join(parent, '.rselectron-gen', name);
  return {
    active: activeDistRoot,
    backup: join(genRoot, 'backup'),
    journal: join(genRoot, 'promote.journal'),
    staging: join(genRoot, 'staging'),
  };
}

function defaultValidate(candidatePath: string): boolean {
  if (!existsSync(candidatePath)) {
    return false;
  }
  try {
    return readdirSync(candidatePath).length > 0;
  } catch {
    return false;
  }
}

function writeJournal(journalPath: string, step: string): void {
  mkdirSync(dirname(journalPath), { recursive: true });
  writeFileSync(journalPath, `${step}\n`, 'utf8');
}

function clearJournal(journalPath: string): void {
  rmSync(journalPath, { force: true });
}

async function renameWithRetry(
  from: string,
  to: string,
  rename: RenameFn,
  retries: number,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      rename(from, to);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError;
}

/**
 * Snapshot the stable compiler staging directory into a unique candidate sibling.
 * Staging is consumed (renamed) so the next compile must recreate it.
 */
export function createCandidateSnapshot(layout: GenerationLayout): string {
  if (!existsSync(layout.staging)) {
    throw new RselectronError(
      'RSELECTRON_GENERATION_PROMOTE_FAILED',
      'orchestration',
      `Staging generation is missing: ${layout.staging}`,
    );
  }
  mkdirSync(dirname(layout.staging), { recursive: true });
  const candidate = join(
    dirname(layout.staging),
    `candidate-${process.hrtime.bigint().toString()}`,
  );
  if (existsSync(candidate)) {
    rmSync(candidate, { force: true, recursive: true });
  }
  renameSync(layout.staging, candidate);
  return candidate;
}

/**
 * Journaled same-filesystem promotion:
 * validate → (optional beforePromote) → active→backup → candidate→active → drop backup.
 */
export async function promoteGeneration(
  options: PromoteGenerationOptions,
): Promise<void> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const rename = options.rename ?? renameSync;
  const validate = options.validate ?? defaultValidate;
  const layout = resolveGenerationLayout(options.active);
  const { active, candidate } = options;

  if (!validate(candidate)) {
    rmSync(candidate, { force: true, recursive: true });
    throw new RselectronError(
      'RSELECTRON_GENERATION_PROMOTE_FAILED',
      options.role,
      `Candidate generation failed validation: ${candidate}`,
      'Fix the Role build output and retry; the active generation was left unchanged.',
    );
  }

  await options.beforePromote?.();

  mkdirSync(dirname(active), { recursive: true });
  mkdirSync(dirname(layout.backup), { recursive: true });

  rmSync(layout.backup, { force: true, recursive: true });
  clearJournal(layout.journal);

  try {
    writeJournal(layout.journal, 'backup-active');
    if (existsSync(active)) {
      await renameWithRetry(active, layout.backup, rename, retries);
    }

    writeJournal(layout.journal, 'promote-candidate');
    await renameWithRetry(candidate, active, rename, retries);

    writeJournal(layout.journal, 'drop-backup');
    rmSync(layout.backup, { force: true, recursive: true });
    clearJournal(layout.journal);
  } catch (cause) {
    try {
      if (!existsSync(active) && existsSync(layout.backup)) {
        rename(layout.backup, active);
      }
    } catch {
      // Preserve original failure below.
    }
    rmSync(layout.backup, { force: true, recursive: true });
    clearJournal(layout.journal);
    throw new RselectronError(
      'RSELECTRON_GENERATION_PROMOTE_FAILED',
      options.role,
      cause,
      'The previous active generation was preserved when possible.',
    );
  }
}

export function ensureStagingDirectory(layout: GenerationLayout): void {
  mkdirSync(layout.staging, { recursive: true });
}

export function isStagingEmpty(layout: GenerationLayout): boolean {
  if (!existsSync(layout.staging)) {
    return true;
  }
  try {
    return readdirSync(layout.staging).length === 0;
  } catch {
    return true;
  }
}

export function roleDistRoot(appRoot: string, config: RoleConfig): string {
  const dist = config.output?.distPath;
  const root = typeof dist === 'string' ? dist : (dist?.root ?? 'dist');
  return isAbsolute(root) ? root : resolve(config.root ?? appRoot, root);
}

/**
 * Point a watched Node Role at a staging generation outside the active output.
 */
export function withStagingOutput(
  config: RoleConfig,
  layout: GenerationLayout,
): RoleConfig {
  const existingDist = config.output?.distPath;
  const distPath =
    typeof existingDist === 'string'
      ? layout.staging
      : {
          ...(typeof existingDist === 'object' && existingDist !== null
            ? existingDist
            : {}),
          root: layout.staging,
        };

  const existingRspack = config.tools?.rspack;
  let rspack: NonNullable<NonNullable<RsbuildConfig['tools']>['rspack']>;
  if (typeof existingRspack === 'function') {
    const previous = existingRspack;
    rspack = (merged, utils) => {
      previous(merged, utils);
      utils.mergeConfig(merged, {
        optimization: { emitOnErrors: false },
      });
    };
  } else if (
    typeof existingRspack === 'object' &&
    existingRspack !== null &&
    !Array.isArray(existingRspack)
  ) {
    rspack = {
      ...existingRspack,
      optimization: {
        ...(typeof existingRspack.optimization === 'object' &&
        existingRspack.optimization !== null
          ? existingRspack.optimization
          : {}),
        emitOnErrors: false,
      },
    } as NonNullable<NonNullable<RsbuildConfig['tools']>['rspack']>;
  } else {
    rspack = {
      optimization: { emitOnErrors: false },
    } as NonNullable<NonNullable<RsbuildConfig['tools']>['rspack']>;
  }

  return {
    ...config,
    output: {
      ...config.output,
      cleanDistPath: config.output?.cleanDistPath ?? true,
      distPath,
    },
    tools: {
      ...config.tools,
      rspack,
    },
  };
}
