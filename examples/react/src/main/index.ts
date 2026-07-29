import { app, BrowserWindow } from 'electron';

app.whenReady().then(() => {
  const window = new BrowserWindow({
    webPreferences: {
      preload: new URL('../preload/index.js', import.meta.url).pathname,
    },
  });
  const rendererUrl = process.env.RSELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void window.loadURL(rendererUrl);
  }
});
