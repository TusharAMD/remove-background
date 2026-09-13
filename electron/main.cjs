const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;
const PYTHON_PORT = 8765;
const DEV_URL = 'http://localhost:5173';

function startPythonBackend() {
  console.log('[Electron] Starting native PyTorch BiRefNet server...');
  const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
  const serverScript = path.join(__dirname, 'birefnet_server.py');

  pythonProcess = spawn(pythonExe, [serverScript], {
    stdio: 'pipe',
    shell: true
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[PyTorch]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[PyTorch Log]: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'Background Remover Studio (Ultra Detail)',
    backgroundColor: '#030712',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Try loading local dev server or static built dist
  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  const fs = require('fs');

  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL(DEV_URL);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  startPythonBackend();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    console.log('[Electron] Terminating Python process...');
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
