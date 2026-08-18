'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('panelApi', {
  getState: () => ipcRenderer.invoke('panel:get-state'),
  start: () => ipcRenderer.invoke('panel:start'),
  stop: () => ipcRenderer.invoke('panel:stop'),
  openSettings: () => ipcRenderer.invoke('panel:open-settings'),
  toggleAutoLaunch: (checked) => ipcRenderer.invoke('panel:toggle-autolaunch', checked),
  toggleSound: (checked) => ipcRenderer.invoke('panel:toggle-sound', checked),
  setLanguage: (lang) => ipcRenderer.invoke('panel:set-language', lang),
  openFolder: () => ipcRenderer.invoke('panel:open-folder'),
  openUpdate: () => ipcRenderer.invoke('panel:open-update'),
  quit: () => ipcRenderer.invoke('panel:quit'),
  reportHeight: (height) => ipcRenderer.send('panel:report-height', height),
  onState: (callback) => ipcRenderer.on('panel:state-changed', (_event, state) => callback(state)),
  onLevelUp: (callback) => ipcRenderer.on('panel:level-up', () => callback()),
});
