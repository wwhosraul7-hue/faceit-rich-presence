/**
 * Electron entry point - packages the FACEIT presence service (presence.js)
 * as a background tray app: a clean popover panel anchored to the tray icon
 * (Start/Stop, autostart, language), a Settings window, RO/EN UI, a FACEIT
 * level badge on Rich Presence, and a simple GitHub Releases update check.
 *
 * Windows created: the tray panel (created once, shown/hidden) and the
 * Settings window (created on demand). No native tray context menu is used
 * for the primary interaction - only as a minimal right-click fallback.
 */

'use strict';

const { app, Tray, Menu, shell, BrowserWindow, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const presence = require('./presence');
const configStore = require('./config-store');
const appSettingsStore = require('./app-settings');
const i18n = require('./i18n');
const { checkForUpdate } = require('./update-check');
const { findCs2CfgFolders } = require('./steam-locate');

const FACEIT_DEVELOPERS_URL = 'https://developers.faceit.com/';
const DISCORD_DEVELOPERS_URL = 'https://discord.com/developers/applications';
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
// This file lives in src/ - renderer/, build/ etc. are siblings of src/, one level up.
const PROJECT_ROOT = path.join(__dirname, '..');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let tray = null;
  let panelWindow = null;
  let settingsWindow = null;
  let appSettings = { ...appSettingsStore.DEFAULTS };
  let updateInfo = null;

  /** Folder where .env / cache.json / the GSI cfg live, next to the running exe. */
  function getBaseDir() {
    if (!app.isPackaged) return PROJECT_ROOT;
    // electron-builder's "portable" target sets this to the real folder the
    // user put the .exe in (the exe itself runs from a temp extraction dir).
    if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
    return path.dirname(process.execPath);
  }

  /**
   * Stable path to the real .exe, for registering auto-launch at login.
   * process.execPath points at a temp extraction folder for portable builds
   * (a new one each run), which would make the Registry Run entry go stale -
   * PORTABLE_EXECUTABLE_FILE is the actual file the user double-clicked.
   */
  function getLaunchTarget() {
    return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  }

  /** Enable "start at login" once, the first time the packaged app ever runs. */
  function ensureDefaultAutoLaunch(baseDir) {
    if (!app.isPackaged) return;
    const marker = path.join(baseDir, '.autolaunch-set');
    if (fs.existsSync(marker)) return;
    try {
      app.setLoginItemSettings({ openAtLogin: true, path: getLaunchTarget() });
      fs.writeFileSync(marker, 'ok');
    } catch (err) {
      console.error('Could not register auto-launch at boot:', err.message);
    }
  }

  function setLanguage(lang) {
    if (!i18n.SUPPORTED_LANGUAGES.includes(lang) || lang === appSettings.language) return;
    appSettings = appSettingsStore.save(getBaseDir(), { language: lang });
    pushPanelState();
    pushSettingsLanguage();
  }

  // ---------- windows ----------
  // Note: deliberately no `backgroundMaterial: 'acrylic'` here. On Windows it
  // paints the *whole* window rectangle regardless of CSS border-radius/alpha,
  // which shows up as a square ghost box around the rounded card. The frosted
  // look instead comes purely from `transparent: true` + CSS backdrop-filter
  // blur in panel.css/settings.css, which respects the rounded shape.

  function createPanelWindow() {
    panelWindow = new BrowserWindow({
      width: 320,
      height: 462,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: true,
      movable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      webPreferences: {
        preload: path.join(PROJECT_ROOT, 'renderer', 'panel-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    panelWindow.loadFile(path.join(PROJECT_ROOT, 'renderer', 'panel.html'));
    // resizable must stay true for setSize() to work on this frameless/transparent
    // window (Windows quirk) - block manual drag-resize, but allow our own setSize calls.
    // ('will-resize' only fires for user-driven resizes, not programmatic ones.)
    panelWindow.on('will-resize', (event) => event.preventDefault());
    panelWindow.on('blur', () => {
      if (panelWindow && !panelWindow.webContents.isDevToolsFocused()) panelWindow.hide();
    });
  }

  function positionPanel() {
    if (!panelWindow || !tray) return;
    const trayBounds = tray.getBounds();
    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    const workArea = display.workArea;
    const [panelWidth, panelHeight] = panelWindow.getSize();

    let x = Math.round(trayBounds.x + trayBounds.width / 2 - panelWidth / 2);
    const taskbarAtBottom = trayBounds.y > workArea.y + workArea.height / 2;
    const y = taskbarAtBottom ? trayBounds.y - panelHeight - 8 : trayBounds.y + trayBounds.height + 8;

    x = Math.max(workArea.x + 8, Math.min(x, workArea.x + workArea.width - panelWidth - 8));
    panelWindow.setPosition(x, y);
  }

  /** Snugly resize the panel to its actual content height, keeping it anchored near the tray icon. */
  function resizePanel(contentHeight) {
    if (!panelWindow) return;
    const width = 320;
    const newHeight = Math.min(600, Math.max(160, Math.ceil(contentHeight) + 20));
    const [, currentHeight] = panelWindow.getSize();
    if (Math.abs(currentHeight - newHeight) < 2) return;
    panelWindow.setSize(width, newHeight);
    if (panelWindow.isVisible()) positionPanel();
  }

  function togglePanel() {
    if (!panelWindow) return;
    if (panelWindow.isVisible()) {
      panelWindow.hide();
    } else {
      positionPanel();
      panelWindow.show();
      panelWindow.focus();
    }
  }

  function openSettingsWindow() {
    if (settingsWindow) {
      settingsWindow.focus();
      return;
    }
    settingsWindow = new BrowserWindow({
      width: 460,
      height: 730,
      resizable: false,
      minimizable: false,
      maximizable: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      icon: path.join(PROJECT_ROOT, 'build', 'icon.ico'),
      title: 'FACEIT RPC — Configurare',
      webPreferences: {
        preload: path.join(PROJECT_ROOT, 'renderer', 'settings-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    settingsWindow.loadFile(path.join(PROJECT_ROOT, 'renderer', 'settings.html'));
    settingsWindow.on('closed', () => {
      settingsWindow = null;
    });
  }

  function buildMinimalTrayMenu() {
    const s = i18n.allStrings(appSettings.language);
    return Menu.buildFromTemplate([
      { label: s.panelSettings, click: () => openSettingsWindow() },
      { type: 'separator' },
      {
        label: s.panelQuit,
        click: () => {
          presence.stop().finally(() => app.quit());
        },
      },
    ]);
  }

  // ---------- state push to renderers ----------

  function getPanelState() {
    return {
      language: appSettings.language,
      strings: i18n.allStrings(appSettings.language),
      status: presence.lastStatusText,
      running: presence.isRunning(),
      configured: presence.isConfigured(),
      autoLaunch: app.getLoginItemSettings().openAtLogin,
      update: updateInfo,
    };
  }

  function pushPanelState() {
    if (panelWindow) panelWindow.webContents.send('panel:state-changed', getPanelState());
  }

  function pushSettingsLanguage() {
    if (settingsWindow) {
      settingsWindow.webContents.send('settings:language-changed', {
        language: appSettings.language,
        strings: i18n.allStrings(appSettings.language),
      });
    }
  }

  function refreshTray() {
    if (!tray) return;
    tray.setToolTip(`FACEIT RPC — ${presence.lastStatusText}`);
    pushPanelState();
  }

  // ---------- update check ----------

  async function runUpdateCheck() {
    const result = await checkForUpdate(app.getVersion());
    if (result.checked) {
      updateInfo = result.available
        ? { available: true, latestVersion: result.latestVersion, url: result.url }
        : { available: false };
      pushPanelState();
    }
  }

  // ---------- IPC ----------

  function registerIpcHandlers() {
    // panel
    ipcMain.handle('panel:get-state', () => getPanelState());
    ipcMain.handle('panel:start', () => presence.start());
    ipcMain.handle('panel:stop', () => presence.stop());
    ipcMain.handle('panel:open-settings', () => openSettingsWindow());
    ipcMain.handle('panel:toggle-autolaunch', (_event, checked) => {
      app.setLoginItemSettings({ openAtLogin: checked, path: getLaunchTarget() });
      pushPanelState();
    });
    ipcMain.handle('panel:set-language', (_event, lang) => setLanguage(lang));
    ipcMain.handle('panel:open-folder', () => shell.openPath(getBaseDir()));
    ipcMain.handle('panel:open-update', () => {
      if (updateInfo && updateInfo.url) shell.openExternal(updateInfo.url);
    });
    ipcMain.handle('panel:quit', () => {
      presence.stop().finally(() => app.quit());
    });
    ipcMain.on('panel:report-height', (_event, height) => resizePanel(height));

    // settings
    ipcMain.handle('settings:get-ui-state', () => ({
      language: appSettings.language,
      strings: i18n.allStrings(appSettings.language),
    }));
    ipcMain.handle('settings:set-language', (_event, lang) => setLanguage(lang));
    ipcMain.handle('settings:load', () => configStore.loadSettings(getBaseDir()));
    ipcMain.handle('settings:get-status', () => presence.lastStatusText);
    ipcMain.handle('settings:regen-token', () => crypto.randomBytes(16).toString('hex'));
    ipcMain.handle('settings:open-faceit-devs', () => shell.openExternal(FACEIT_DEVELOPERS_URL));
    ipcMain.handle('settings:open-discord-devs', () => shell.openExternal(DISCORD_DEVELOPERS_URL));

    ipcMain.handle('settings:install-gsi', () => {
      const s = i18n.allStrings(appSettings.language);
      const baseDir = getBaseDir();
      const src = configStore.cfgPath(baseDir);
      if (!fs.existsSync(src)) {
        return { ok: false, message: s.installSaveFirst };
      }
      const folders = findCs2CfgFolders();
      if (folders.length === 0) {
        return { ok: false, message: s.installNotFound };
      }
      const copied = [];
      for (const dir of folders) {
        try {
          fs.copyFileSync(src, path.join(dir, 'gamestate_integration_faceitrpc.cfg'));
          copied.push(dir);
        } catch {
          // try the next library folder
        }
      }
      if (copied.length === 0) {
        return { ok: false, message: s.installFailed };
      }
      return { ok: true, message: i18n.t(appSettings.language, 'installOk', { folders: copied.join(', ') }) };
    });

    ipcMain.handle('settings:save', async (_event, payload) => {
      const errors = configStore.validate(payload);
      if (Object.keys(errors).length > 0) {
        return { ok: false, errors };
      }

      const baseDir = getBaseDir();
      if (presence.isRunning()) {
        await presence.stop();
      }

      configStore.writeEnvFile(baseDir, payload);
      configStore.writeGsiCfgFile(baseDir, payload);

      const configured = presence.configure(baseDir);
      refreshTray();
      if (configured) presence.start();

      return { ok: true };
    });
  }

  // ---------- lifecycle ----------

  app.whenReady().then(() => {
    app.setAppUserModelId('com.faceitrpc.tray');
    Menu.setApplicationMenu(null);

    const baseDir = getBaseDir();
    appSettings = appSettingsStore.load(baseDir);

    const iconPath = path.join(PROJECT_ROOT, 'build', 'icon.ico');
    tray = new Tray(iconPath);
    tray.setToolTip('FACEIT RPC');
    tray.on('click', togglePanel);
    tray.on('right-click', () => tray.popUpContextMenu(buildMinimalTrayMenu()));

    createPanelWindow();

    presence.on('status', refreshTray);
    presence.on('error', (err) => {
      console.error('Presence error:', err.message);
      refreshTray();
    });

    registerIpcHandlers();

    const configured = presence.configure(baseDir);
    refreshTray();

    ensureDefaultAutoLaunch(baseDir);

    if (configured) {
      presence.start();
    } else {
      openSettingsWindow();
    }

    refreshTray();

    setTimeout(runUpdateCheck, 5000);
    setInterval(runUpdateCheck, UPDATE_CHECK_INTERVAL_MS);
  });

  app.on('second-instance', () => {
    refreshTray();
    if (!presence.isConfigured()) {
      openSettingsWindow();
    } else if (panelWindow) {
      positionPanel();
      panelWindow.show();
      panelWindow.focus();
    }
  });

  // Tray-only app: never quit just because there are no windows.
  app.on('window-all-closed', (event) => {
    if (event) event.preventDefault();
  });

  app.on('before-quit', () => {
    presence.stop();
  });
}
