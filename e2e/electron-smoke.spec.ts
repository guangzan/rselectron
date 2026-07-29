import { expect, test, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const smokeMain = join(here, 'fixtures/smoke-main.cjs');

test('Playwright can launch project-local Electron and observe a window', async () => {
  const executablePath = String(require('electron'));
  const app = await electron.launch({
    executablePath,
    args: [smokeMain],
  });

  try {
    const window = await app.firstWindow();
    await expect(window).toHaveTitle('rselectron-e2e');
    await expect(window.locator('h1')).toHaveText('ok');
  } finally {
    await app.close();
  }
});
