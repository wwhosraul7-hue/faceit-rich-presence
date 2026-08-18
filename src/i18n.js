/**
 * Small hand-rolled i18n dictionary for the tray panel + settings window.
 * No framework - just a flat key -> {ro, en} map and a t(lang, key) lookup.
 */

'use strict';

const STRINGS = {
  appName: { ro: 'FACEIT RPC', en: 'FACEIT RPC' },

  // status
  statusStopped: { ro: 'Oprit', en: 'Stopped' },
  statusConnecting: { ro: 'Se conecteaza la Discord...', en: 'Connecting to Discord...' },
  statusRetrying: { ro: 'Discord nu ruleaza - reincerc...', en: 'Discord is not running - retrying...' },
  statusMissingConfig: { ro: 'Config lipsa', en: 'Missing configuration' },
  statusDisconnected: { ro: 'Conexiune Discord pierduta. Reincerc...', en: 'Discord connection lost. Retrying...' },

  // panel
  panelStart: { ro: 'Start', en: 'Start' },
  panelStop: { ro: 'Stop', en: 'Stop' },
  panelSettings: { ro: 'Configurare', en: 'Settings' },
  panelAutoLaunch: { ro: 'Pornire automata la boot', en: 'Start automatically at boot' },
  panelOpenFolder: { ro: 'Deschide folderul de configurare', en: 'Open the config folder' },
  panelQuit: { ro: 'Iesire', en: 'Quit' },
  panelUpdateAvailable: { ro: 'Versiune noua disponibila', en: 'New version available' },
  panelUpdateReady: { ro: 'Actualizare gata - click sa repornesti', en: 'Update ready - click to restart' },
  panelUpdateDownload: { ro: 'Descarca', en: 'Download' },
  panelUpToDate: { ro: 'Ai ultima versiune', en: "You're up to date" },
  panelLanguage: { ro: 'Limba', en: 'Language' },

  // settings window
  settingsTitle: { ro: 'Configurare', en: 'Settings' },
  settingsApiKeyLabel: { ro: 'Cheia API FACEIT', en: 'FACEIT API key' },
  settingsApiKeyHint: {
    ro: 'Server-side API Key din developers.faceit.com (cont FACEIT propriu).',
    en: 'Server-side API key from developers.faceit.com (your own FACEIT account).',
  },
  settingsApiKeyHintPre: { ro: 'Server-side API Key din', en: 'Server-side API key from' },
  settingsShow: { ro: 'Arata', en: 'Show' },
  settingsHide: { ro: 'Ascunde', en: 'Hide' },
  settingsNicknameLabel: { ro: 'Nickname FACEIT', en: 'FACEIT nickname' },
  settingsNicknamePlaceholder: {
    ro: 'nickname-ul tau exact de pe FACEIT',
    en: 'your exact FACEIT nickname',
  },
  settingsPollLabel: { ro: 'Interval verificare (secunde)', en: 'Check interval (seconds)' },
  settingsAdvanced: { ro: 'Setari avansate', en: 'Advanced settings' },
  settingsDiscordIdLabel: { ro: 'Discord Application ID', en: 'Discord Application ID' },
  settingsDiscordIdHint: {
    ro: 'Completat implicit cu aplicatia comuna FACEIT RPC. Schimba doar daca vrei propria aplicatie din discord.com/developers.',
    en: 'Pre-filled with the shared FACEIT RPC app. Only change it if you want your own app from discord.com/developers.',
  },
  settingsDiscordIdHintPre: {
    ro: 'Completat implicit cu aplicatia comuna FACEIT RPC. Schimba doar daca vrei propria aplicatie din',
    en: 'Pre-filled with the shared FACEIT RPC app. Only change it if you want your own app from',
  },
  settingsGsiPortLabel: { ro: 'Port GSI (local)', en: 'GSI port (local)' },
  settingsGsiTokenLabel: { ro: 'Token GSI', en: 'GSI token' },
  settingsGsiTokenHint: {
    ro: 'Generat automat. Se scrie identic si in fisierul .cfg pentru CS2.',
    en: 'Generated automatically. Written identically into the CS2 .cfg file.',
  },
  settingsRegen: { ro: 'Regenereaza', en: 'Regenerate' },
  settingsInstallGsi: { ro: 'Instaleaza automat fisierul GSI in CS2', en: 'Auto-install the GSI file into CS2' },
  settingsCancel: { ro: 'Inchide', en: 'Close' },
  settingsSave: { ro: 'Salveaza si porneste', en: 'Save and start' },
  settingsSaving: { ro: 'Se salveaza...', en: 'Saving...' },
  settingsStatusPrefix: { ro: 'Status', en: 'Status' },

  errClientId: {
    ro: 'Trebuie sa fie un numar (Application ID din Discord Developer Portal).',
    en: 'Must be a number (Application ID from the Discord Developer Portal).',
  },
  errApiKey: { ro: 'Completeaza cheia API FACEIT.', en: 'Enter your FACEIT API key.' },
  errNickname: { ro: 'Completeaza nickname-ul tau exact de pe FACEIT.', en: 'Enter your exact FACEIT nickname.' },
  errPoll: { ro: 'Intre 5 si 3600 secunde.', en: 'Between 5 and 3600 seconds.' },
  errPort: { ro: 'Port invalid (1-65535).', en: 'Invalid port (1-65535).' },
  errToken: { ro: 'Tokenul GSI nu poate fi gol.', en: 'The GSI token cannot be empty.' },

  installSaveFirst: {
    ro: 'Salveaza intai configurarea (fisierul .cfg se genereaza la Salvare).',
    en: 'Save the configuration first (the .cfg file is generated on Save).',
  },
  installNotFound: {
    ro: 'Nu am gasit automat folderul CS2. Copiaza manual fisierul gamestate_integration_faceitrpc.cfg din folderul aplicatiei in ...\\Counter-Strike Global Offensive\\game\\csgo\\cfg\\',
    en: "Couldn't auto-detect the CS2 folder. Copy gamestate_integration_faceitrpc.cfg from the app's folder into ...\\Counter-Strike Global Offensive\\game\\csgo\\cfg\\ manually.",
  },
  installFailed: {
    ro: 'Am gasit folderul CS2 dar nu am putut copia fisierul (poate CS2 ruleaza chiar acum - inchide-l si incearca din nou).',
    en: "Found the CS2 folder but couldn't copy the file (CS2 might be running right now - close it and try again).",
  },
  installOk: {
    ro: 'Instalat in: {folders}. Reporneste CS2 daca era deschis.',
    en: 'Installed in: {folders}. Restart CS2 if it was open.',
  },
  searchingCs2: { ro: 'Se cauta folderul CS2...', en: 'Looking for the CS2 folder...' },

  // ELO change notification
  eloNotifTitleUp: { ro: 'ELO in crestere', en: 'ELO increased' },
  eloNotifTitleDown: { ro: 'ELO in scadere', en: 'ELO decreased' },
  eloNotifBody: {
    ro: '{sign}{diff} ELO -> acum {elo} (Nivel {level})',
    en: '{sign}{diff} ELO -> now {elo} (Level {level})',
  },

  // panel: sound toggle + ELO sparkline
  panelSound: { ro: 'Sunet la Start/Stop', en: 'Sound on Start/Stop' },
  panelEloChart: { ro: 'Evolutie ELO', en: 'ELO trend' },
  panelSessionToday: { ro: '{wins}W - {losses}L azi', en: '{wins}W - {losses}L today' },

  // level-up notification
  levelUpTitle: { ro: 'Nivel nou!', en: 'New level!' },
  levelUpBody: { ro: 'Ai urcat la Nivel {level} pe FACEIT', en: "You've reached Level {level} on FACEIT" },

  // settings: match history
  settingsHistoryLabel: { ro: 'Ultimele meciuri', en: 'Recent matches' },
  settingsHistoryEmpty: { ro: 'Inca niciun meci inregistrat.', en: 'No matches recorded yet.' },
  settingsHistoryWin: { ro: 'Victorie', en: 'Win' },
  settingsHistoryLoss: { ro: 'Infrangere', en: 'Loss' },
};

function t(lang, key, vars) {
  const entry = STRINGS[key];
  if (!entry) return key;
  let text = entry[lang] || entry.ro || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

/** Flat {key: text} object for a given language - handy to send whole to a renderer. */
function allStrings(lang) {
  const out = {};
  for (const key of Object.keys(STRINGS)) out[key] = t(lang, key);
  return out;
}

module.exports = { t, allStrings, SUPPORTED_LANGUAGES: ['ro', 'en'] };
