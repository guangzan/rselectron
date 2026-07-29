import { app, BrowserWindow } from 'electron';

app.whenReady().then(() => {
  const window = new BrowserWindow({ show: false });
  void window;
});
