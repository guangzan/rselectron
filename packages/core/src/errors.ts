import type { Role } from './types.ts';

export type RselectronErrorRole = Role | 'electron' | 'orchestration';

function toMessage(code: string, cause: unknown): string {
  if (typeof cause === 'string') {
    return cause;
  }

  if (cause instanceof Error && cause.message.length > 0) {
    return cause.message;
  }

  return code;
}

export class RselectronError extends Error {
  readonly code: string;
  readonly role: RselectronErrorRole;
  readonly hint?: string;

  constructor(
    code: string,
    role: RselectronErrorRole,
    cause?: unknown,
    hint?: string,
  ) {
    super(toMessage(code, cause), cause === undefined ? undefined : { cause });
    this.name = 'RselectronError';
    this.code = code;
    this.role = role;
    this.hint = hint;
  }
}
