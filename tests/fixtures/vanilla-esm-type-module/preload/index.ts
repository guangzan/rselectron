import { contextBridge } from 'electron';

// Residual require under ESM Preload (same module rules as Main).
const leftpad = require('leftpad') as () => string;

contextBridge.exposeInMainWorld('rselectronFixture', {
  leftpad: leftpad(),
  ready: true,
});
