import { app, ipcMain, BrowserWindow, dialog, session } from 'electron';
import installExtension, {
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import * as fs from 'fs';
import * as path from 'path';

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    frame: false,
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: true,
    trafficLightPosition: { x: 21, y: 21 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    (async () => {
      await installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
        .then((name: string) => console.log(`Added Extension:  ${name}`))
        .catch((err: string) => console.log('An error occurred: ', err))
        .finally(() => {
          mainWindow.webContents.openDevTools();
        });
      await mainWindow.loadURL(import.meta.env.VITE_DEV_SERVER_URL);
    })();
  } else {
    (async () => {
      await mainWindow.loadURL(
        new URL('../build/renderer/index.html', 'file://' + __dirname).toString()
      );
    })();
  }
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        // TODO better policy
        'Content-Security-Policy': [
          "default-src *  data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval'",
        ],
      },
    });
  });

  mainWindow.on('ready-to-show', () => mainWindow.show());
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('open-file', (event, options) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    return dialog.showOpenDialog(win, options);
  } else {
    dialog.showOpenDialog(options);
  }
});

ipcMain.handle('save-file', (event, options) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    return dialog.showSaveDialog(win, options);
  } else {
    dialog.showSaveDialog(options);
  }
});

function findServer() {
  const possibilities = [
    // In packaged app
    path.join(process.resourcesPath, 'server', 'server'),
    // In development
    path.join(__dirname, 'server', 'server'),
    path.join(process.cwd(), 'server', 'server'),
  ];
  for (const path of possibilities) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  dialog.showErrorBox(
    'Could not find server',
    'Failed to find local executable for server. Please report this issue to https://github.com/audapolis/audapolis/issues'
  );
  app.quit();
}
console.log('Server is at', findServer());
