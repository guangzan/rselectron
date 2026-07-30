# 0003. Promote only successful role generations

- Status: Accepted
- Date: 2026-07-24

## Context

During a watched development session, a failed rebuild must not corrupt the files currently used by Electron. Keeping the previous in-memory compilation result is insufficient when the compiler or its plugins have already deleted or partially written the active output directory.

Rspack's error-emission controls can prevent assets from an erroneous compilation from being emitted, but they do not by themselves define a transaction around cleaning, plugin writes, or a multi-file output generation. They therefore cannot guarantee the required last-known-good behavior.

## Decision

Each watched Main and Preload build produces a candidate generation outside the active generation. Rselectron promotes a candidate only after the role compilation completes successfully. Failed candidates are discarded and the active last-known-good generation remains unchanged.

Candidates are created as unique sibling directories on the same filesystem as the active role output. Promotion uses a journaled rename sequence with an active backup: validate the candidate, move the active generation to backup, move the candidate to the active path, and remove the backup only after success. Any failed step is retried within a bounded policy and then rolled back; a promotion that cannot be completed is treated as a failed update. Main promotion occurs while the Electron child is stopped. Compiler `noEmitOnErrors` remains enabled, but direct writes to the active generation are forbidden.

Initial failure behavior depends on watch mode:

- Without watch, any initial role failure ends the command unsuccessfully.
- With watch, the session waits for every required role's first successful generation before Electron starts.

After startup, a successful Main promotion restarts Electron after the configured debounce. A successful Preload promotion broadcasts a full reload to all renderer pages connected to the Renderer role's development server. In a multi-page renderer, this is role-wide broadcast behavior, not per-window orchestration.

Compiler error-emission controls remain enabled as defense in depth, but they are not the transaction boundary.

The default development session provides Renderer HMR and does not watch Main or Preload. `--watch` opts into role-aware Main and Preload watching, subject to per-role configuration and restart debounce. Every Electron exit, including a clean user exit, ends the development or preview command and closes all role instances and servers.

`preview` builds first and then launches Electron unless `--skip-build` is supplied. `build` is a finite production operation and never accepts watch mode. Renderer-only development validates that every required skipped Main or Preload artifact exists before starting.

## Consequences

- The active generation never contains a known failed compilation.
- Development builds require staging space and promotion/cleanup logic.
- Promotion behavior must be tested on macOS, Linux, and Windows, including files held open by Electron.
- A renderer page not connected to the development server cannot receive the Preload reload broadcast; Rselectron does not model or discover windows separately.
- Main and Preload promotions are independent, so a later role failure does not roll back another role's already successful generation.
- Rename and rollback behavior must tolerate antivirus, indexers, and transient file handles on Windows; exhaustion preserves the last-known-good generation and reports a structured update failure.
- Full reload reaches only pages connected to the Renderer development server. A disconnected page receives the new Preload generation only on its next application-controlled navigation or recreation.

## Alternatives considered

### Rely only on Rspack's no-emit-on-errors behavior

Rejected because it does not cover output cleaning, plugin side effects, or partial writes outside compiler-controlled asset emission.

### Write directly to the active output and keep the Electron process alive on failure

Rejected because “process still alive” does not imply that the files on disk remain a coherent last-known-good generation.

### Restart Electron after every Preload update

Rejected because the agreed development behavior is a renderer full reload, and Rselectron does not own a first-class window model.

### Enable Main and Preload watch by default

Rejected because process restarts and preload reloads are disruptive side effects. They require explicit session opt-in.
