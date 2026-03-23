import { contextBridge, ipcRenderer } from 'electron';

const aegisApi = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
};

contextBridge.exposeInMainWorld('aegis', aegisApi);

export type AegisApi = typeof aegisApi;
