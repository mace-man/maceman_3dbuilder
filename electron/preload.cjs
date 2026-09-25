const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getInitialSettings: () => ipcRenderer.invoke('get-initial-settings'),
  saveLanguage: (lang) => ipcRenderer.send('save-language', lang),
  onLanguageChange: (callback) => {
    const listener = (event, lang) => callback(lang);
    ipcRenderer.on('change-language', listener);
    return () => ipcRenderer.removeListener('change-language', listener);
  },
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});
