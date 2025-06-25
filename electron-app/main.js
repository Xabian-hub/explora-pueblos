const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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

ipcMain.handle('load-json', (_, pueblo) => {
  const file = path.join(__dirname, 'json', `${pueblo}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
});

ipcMain.handle('save-json', (_, { pueblo, data }) => {
  const dir = path.join(__dirname, 'json');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const filePath = path.join(dir, `${pueblo}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', ()=>{ if (process.platform!=='darwin') app.quit(); });
