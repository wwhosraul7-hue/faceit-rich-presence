'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getUiState: () => ipcRenderer.invoke('settings:get-ui-state'),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (data) => ipcRenderer.invoke('settings:save', data),
  regenToken: () => ipcRenderer.invoke('settings:regen-token'),
  installGsi: () => ipcRenderer.invoke('settings:install-gsi'),
  openFaceitDevs: () => ipcRenderer.invoke('settings:open-faceit-devs'),
  openDiscordDevs: () => ipcRenderer.invoke('settings:open-discord-devs'),
  getStatus: () => ipcRenderer.invoke('settings:get-status'),
  getMatchHistory: () => ipcRenderer.invoke('settings:get-match-history'),
  setLanguage: (lang) => ipcRenderer.invoke('settings:set-language', lang),
  onStatus: (callback) => ipcRenderer.on('settings:status-changed', (_event, text) => callback(text)),
  onLanguage: (callback) => ipcRenderer.on('settings:language-changed', (_event, state) => callback(state)),
});
