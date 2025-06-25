const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadJSON: (pueblo) => ipcRenderer.invoke('load-json', pueblo),
  saveJSON: (pueblo, data) => ipcRenderer.invoke('save-json', { pueblo, data })
});
