const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: true,
    kiosk: true,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000', // transparent backing so we can shrink to just the timer
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the web client. Can load local dev URL or your hosted Vercel deployment URL.
  // We will default to the local dev URL, but let it check if there is an env configuration.
  const targetUrl = process.env.CLIENT_URL || 'http://localhost:5174/client';
  mainWindow.loadURL(targetUrl);

  // Prevent user from closing window
  mainWindow.on('close', (e) => {
    e.preventDefault();
  });

  // Focus lock
  mainWindow.on('blur', () => {
    if (mainWindow.isKiosk()) {
      mainWindow.focus();
    }
  });
}

// Block keys when PC is locked
function registerShortcuts() {
  // Neutralize Alt+Tab, Alt+F4, Win key etc. by registering empty callbacks
  const keysToBlock = ['Alt+Tab', 'Alt+F4', 'CommandOrControl+W', 'CommandOrControl+Q', 'Escape'];
  keysToBlock.forEach(key => {
    try {
      globalShortcut.register(key, () => {
        console.log(`Blocked key sequence: ${key}`);
      });
    } catch (e) {
      console.warn(`Could not register key block for: ${key}`);
    }
  });

  // Admin bypass hotkey Alt+A+S to exit the lock client instantly
  try {
    globalShortcut.register('Alt+A+S', () => {
      console.log('Admin bypass activated. Exiting application.');
      app.exit(0);
    });
  } catch (e) {
    console.warn('Could not register Alt+A+S admin bypass.');
  }
}

function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  unregisterShortcuts();
});

// IPC communication handlers
ipcMain.on('app-exit', () => {
  console.log('Native Exit signal received. Quitting app...');
  app.exit(0);
});

ipcMain.on('pc-lock', (event) => {
  if (!mainWindow) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  mainWindow.setKiosk(true);
  mainWindow.setFullScreen(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setResizable(true);
  mainWindow.setBounds({ x: 0, y: 0, width, height });
  registerShortcuts();
  
  console.log('Terminal state: LOCKED');
});

ipcMain.on('pc-unlock', (event) => {
  if (!mainWindow) return;

  unregisterShortcuts();
  mainWindow.setKiosk(false);
  mainWindow.setFullScreen(false);
  
  // Keep the timer on top of other windows but reduce its size to top-left corner
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setResizable(true);
  
  // Shrink window bounds to top-left to fit the floating timer overlay and snackbar
  mainWindow.setBounds({ x: 20, y: 20, width: 260, height: 230 });
  mainWindow.setResizable(false);

  console.log('Terminal state: UNLOCKED');
});
