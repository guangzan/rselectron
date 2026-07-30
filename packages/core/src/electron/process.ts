import { spawnSync, type ChildProcess } from 'node:child_process';

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

/**
 * Stop an Electron child and wait until Node observes exit.
 * On Windows, Electron often keeps child processes alive after a soft kill,
 * so fall back to `taskkill /T /F` for the process tree.
 */
export async function stopElectronProcess(
  electronProcess: ChildProcess,
): Promise<void> {
  if (hasExited(electronProcess)) {
    return;
  }

  if (!electronProcess.killed) {
    electronProcess.kill();
  }

  const exited = await Promise.race([
    new Promise<boolean>((resolveExit) => {
      if (hasExited(electronProcess)) {
        resolveExit(true);
        return;
      }
      electronProcess.once('exit', () => {
        resolveExit(true);
      });
    }),
    new Promise<boolean>((resolveTimeout) => {
      setTimeout(() => {
        resolveTimeout(false);
      }, 2_000);
    }),
  ]);

  if (exited || hasExited(electronProcess)) {
    return;
  }

  if (process.platform === 'win32' && electronProcess.pid !== undefined) {
    spawnSync(
      'taskkill',
      ['/pid', String(electronProcess.pid), '/T', '/F'],
      {
        encoding: 'utf8',
        stdio: 'ignore',
        windowsHide: true,
      },
    );
  } else if (!electronProcess.killed) {
    electronProcess.kill('SIGKILL');
  }

  if (hasExited(electronProcess)) {
    return;
  }

  await new Promise<void>((resolveExit) => {
    if (hasExited(electronProcess)) {
      resolveExit();
      return;
    }
    electronProcess.once('exit', () => {
      resolveExit();
    });
  });
}
