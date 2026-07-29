import { contextBridge } from 'electron';
contextBridge.exposeInMainWorld('rselectron', { ok: true });
