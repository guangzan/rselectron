const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 640,
    height: 480,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.setTitle('rselectron-e2e');
  void window.loadURL(
    'data:text/html,<!doctype html><title>rselectron-e2e</title><h1>ok</h1>',
  );
});
