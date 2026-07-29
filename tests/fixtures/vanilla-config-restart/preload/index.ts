import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('rselectronFixture', {
  ready: true,
});
