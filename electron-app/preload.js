// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listJSONFiles: () => ipcRenderer.invoke('list-json-files'),
  loadJSON:      (pueblo) => ipcRenderer.invoke('load-json', pueblo),
  saveJSON:      (pueblo, data) => ipcRenderer.invoke('save-json', { pueblo, data })
});
