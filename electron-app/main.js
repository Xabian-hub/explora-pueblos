// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// 👉 EN ESTE PROYECTO, main.js está en electron-app/
// queremos el json/ que está en la carpeta superior:
const PROJECT_ROOT = path.resolve(__dirname, '..');

// --- IPC Handlers ---

ipcMain.handle('list-json-files', () => {
  const dir = path.join(PROJECT_ROOT, 'json');
  console.log('🔍 list-json-files, buscando en:', dir);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  console.log('🔍 list-json-files encontró:', files);
  return files;
});

ipcMain.handle('load-json', (_, pueblo) => {
  const file = path.join(PROJECT_ROOT, 'json', `${pueblo}.json`);
  console.log('🔍 load-json, cargando:', file);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
});

ipcMain.handle('save-json', (_, { pueblo, data }) => {
  const dir = path.join(PROJECT_ROOT, 'json');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir, `${pueblo}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  console.log('💾 save-json, guardado:', file);
  return true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
