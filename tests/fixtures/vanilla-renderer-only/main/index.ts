import { app, BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const markerPath = join(__dirname, '..', 'launch-marker.json');
function createWindow(): void {
  const url = process.env.RSELECTRON_RENDERER_URL;
  writeFileSync(markerPath, JSON.stringify({ pid: process.pid, url }, null, 2));
  if (url === undefined || url.length === 0) throw new Error("missing url");
  const win = new BrowserWindow({
    height: 600, show: false, width: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: join(__dirname, "../preload/index.cjs") },
  });
  void win.loadURL(url);
}
app.whenReady().then(() => createWindow());
app.on("window-all-closed", () => app.quit());
