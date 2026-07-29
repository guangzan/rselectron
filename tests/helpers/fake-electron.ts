import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function writeFakeElectron(options: {
  appRoot: string;
  execPath?: string;
  version: string;
}): string {
  const electronRoot = join(options.appRoot, 'node_modules/electron');
  const execPath = options.execPath ?? join(electronRoot, 'cli.js');
  mkdirSync(electronRoot, { recursive: true });
  writeFileSync(
    join(electronRoot, 'package.json'),
    `${JSON.stringify(
      {
        main: 'index.js',
        name: 'electron',
        type: 'commonjs',
        version: options.version,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(electronRoot, 'index.js'),
    `module.exports = ${JSON.stringify(execPath)};\n`,
  );
  mkdirSync(dirname(execPath), { recursive: true });
  writeFileSync(
    execPath,
    '#!/usr/bin/env node\nconsole.log("fake-electron");\n',
  );
  return execPath;
}
