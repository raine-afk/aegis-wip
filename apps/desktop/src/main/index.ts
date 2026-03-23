import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

const rendererUrl = process.env.AEGIS_RENDERER_URL;

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#0b1020',
    title: 'Aegis',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (rendererUrl) {
    await window.loadURL(rendererUrl);
    return;
  }

  await window.loadFile(path.join(__dirname, '../renderer/index.html'));
};

app.whenReady().then(async () => {
  ipcMain.handle('app:get-version', () => app.getVersion());

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
