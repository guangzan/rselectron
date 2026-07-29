import { app, BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

declare const __GENERATION_LABEL__: string;

const markerPath = join(__dirname, '..', 'launch-marker.json');

function createWindow(): void {
  const url = process.env.RSELECTRON_RENDERER_URL;
  writeFileSync(
    markerPath,
    `${JSON.stringify(
      {
        generation: __GENERATION_LABEL__,
        pid: process.pid,
        url,
      },
      null,
      2,
    )}\n`,
  );

  if (url === undefined || url.length === 0) {
    throw new Error('RSELECTRON_RENDERER_URL is missing');
  }

  const win = new BrowserWindow({
    height: 600,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.cjs'),
    },
    width: 800,
  });

  void win.loadURL(url);
  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
