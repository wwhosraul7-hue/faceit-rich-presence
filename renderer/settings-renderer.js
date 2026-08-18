'use strict';

const els = {
  faceitApiKey: document.getElementById('faceitApiKey'),
  faceitNickname: document.getElementById('faceitNickname'),
  pollIntervalSeconds: document.getElementById('pollIntervalSeconds'),
  discordClientId: document.getElementById('discordClientId'),
  gsiPort: document.getElementById('gsiPort'),
  gsiAuthToken: document.getElementById('gsiAuthToken'),
  form: document.getElementById('settings-form'),
  save: document.getElementById('save'),
  cancel: document.getElementById('cancel'),
  closeBtn: document.getElementById('close-btn'),
  regenToken: document.getElementById('regen-token'),
  installGsi: document.getElementById('install-gsi'),
  installResult: document.getElementById('install-result'),
  statusLine: document.getElementById('status-line'),
  langButtons: Array.from(document.querySelectorAll('.lang-btn')),
  paletteButtons: Array.from(document.querySelectorAll('.swatch')),
  togglePasswordBtn: document.getElementById('toggle-password'),
};

// element-id -> i18n key, for simple text nodes translated in bulk.
const TEXT_BINDINGS = {
  'win-title': 'appName',
  'win-subtitle': 'settingsTitle',
  // label-apiKey / label-nickname have a <span class="req"> child, handled separately below
  'hint-apiKey-pre': 'settingsApiKeyHintPre',
  'label-poll': 'settingsPollLabel',
  'label-palette': 'settingsBadgePaletteLabel',
  'label-advanced': 'settingsAdvanced',
  'label-clientId': 'settingsDiscordIdLabel',
  'hint-clientId-pre': 'settingsDiscordIdHintPre',
  'label-gsiPort': 'settingsGsiPortLabel',
  'label-gsiToken': 'settingsGsiTokenLabel',
  'hint-gsiToken': 'settingsGsiTokenHint',
  'regen-token': 'settingsRegen',
  'install-gsi': 'settingsInstallGsi',
  'cancel': 'settingsCancel',
};

let currentStrings = null;
let currentPalette = 'orange';

function applyStrings(strings) {
  currentStrings = strings;

  for (const [id, key] of Object.entries(TEXT_BINDINGS)) {
    if (!key) continue;
    const el = document.getElementById(id);
    if (el) el.textContent = strings[key];
  }

  // labels with a required-asterisk span need special handling
  document.getElementById('label-apiKey').firstChild.textContent = strings.settingsApiKeyLabel + ' ';
  document.getElementById('label-nickname').firstChild.textContent = strings.settingsNicknameLabel + ' ';
  document.getElementById('faceitNickname').placeholder = strings.settingsNicknamePlaceholder;

  document.getElementById('toggle-password').textContent =
    els.faceitApiKey.type === 'text' ? strings.settingsHide : strings.settingsShow;

  const saveLabel = els.save.dataset.saving === '1' ? strings.settingsSaving : strings.settingsSave;
  els.save.textContent = saveLabel;
}

function setActiveLangButton(lang) {
  els.langButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.lang === lang));
}

function setActivePalette(palette) {
  currentPalette = palette;
  els.paletteButtons.forEach((btn) => btn.classList.toggle('selected', btn.dataset.palette === palette));
}

function fieldMap() {
  return {
    faceitApiKey: els.faceitApiKey,
    faceitNickname: els.faceitNickname,
    pollIntervalSeconds: els.pollIntervalSeconds,
    discordClientId: els.discordClientId,
    gsiPort: els.gsiPort,
    gsiAuthToken: els.gsiAuthToken,
  };
}

function clearErrors() {
  document.querySelectorAll('.error').forEach((el) => (el.textContent = ''));
}

function showErrors(errors) {
  clearErrors();
  const errorKeyMap = {
    discordClientId: 'errClientId',
    faceitApiKey: 'errApiKey',
    faceitNickname: 'errNickname',
    pollIntervalSeconds: 'errPoll',
    gsiPort: 'errPort',
    gsiAuthToken: 'errToken',
  };
  for (const key of Object.keys(errors)) {
    const el = document.querySelector(`[data-error="${key}"]`);
    if (el) el.textContent = currentStrings[errorKeyMap[key]] || errors[key];
  }
  const firstKey = Object.keys(errors)[0];
  const firstField = fieldMap()[firstKey];
  if (firstField) {
    const advanced = firstField.closest('details');
    if (advanced) advanced.open = true;
    firstField.focus();
  }
}

function collectValues() {
  const f = fieldMap();
  return {
    faceitApiKey: f.faceitApiKey.value.trim(),
    faceitNickname: f.faceitNickname.value.trim(),
    pollIntervalSeconds: f.pollIntervalSeconds.value.trim(),
    discordClientId: f.discordClientId.value.trim(),
    gsiPort: f.gsiPort.value.trim(),
    gsiAuthToken: f.gsiAuthToken.value.trim(),
  };
}

async function init() {
  const uiState = await window.api.getUiState();
  applyStrings(uiState.strings);
  setActiveLangButton(uiState.language);
  setActivePalette(uiState.badgePalette);

  const settings = await window.api.loadSettings();
  const f = fieldMap();
  f.faceitApiKey.value = settings.faceitApiKey;
  f.faceitNickname.value = settings.faceitNickname;
  f.pollIntervalSeconds.value = settings.pollIntervalSeconds;
  f.discordClientId.value = settings.discordClientId;
  f.gsiPort.value = settings.gsiPort;
  f.gsiAuthToken.value = settings.gsiAuthToken;

  const status = await window.api.getStatus();
  els.statusLine.textContent = `${uiState.strings.settingsStatusPrefix}: ${status}`;
}

window.api.onStatus((text) => {
  if (currentStrings) {
    els.statusLine.textContent = `${currentStrings.settingsStatusPrefix}: ${text}`;
  }
});

window.api.onLanguage((state) => {
  applyStrings(state.strings);
  setActiveLangButton(state.language);
});

document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-toggle-password');
    const input = document.getElementById(id);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.textContent = showing ? currentStrings.settingsShow : currentStrings.settingsHide;
  });
});

document.querySelectorAll('[data-open]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const target = link.getAttribute('data-open');
    if (target === 'faceit') window.api.openFaceitDevs();
    if (target === 'discord') window.api.openDiscordDevs();
  });
});

els.regenToken.addEventListener('click', async () => {
  els.gsiAuthToken.value = await window.api.regenToken();
});

els.cancel.addEventListener('click', () => window.close());
els.closeBtn.addEventListener('click', () => window.close());

els.langButtons.forEach((btn) => {
  btn.addEventListener('click', () => window.api.setLanguage(btn.dataset.lang));
});

els.paletteButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setActivePalette(btn.dataset.palette);
    window.api.setPalette(btn.dataset.palette);
  });
});

els.installGsi.addEventListener('click', async () => {
  els.installGsi.disabled = true;
  els.installResult.textContent = currentStrings.searchingCs2;
  els.installResult.className = 'install-result';
  try {
    const result = await window.api.installGsi();
    els.installResult.textContent = result.message;
    els.installResult.className = 'install-result ' + (result.ok ? 'ok' : 'fail');
  } finally {
    els.installGsi.disabled = false;
  }
});

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  els.save.dataset.saving = '1';
  els.save.disabled = true;
  els.save.textContent = currentStrings.settingsSaving;
  try {
    const result = await window.api.saveSettings(collectValues());
    if (!result.ok) {
      showErrors(result.errors || {});
      return;
    }
    window.close();
  } finally {
    els.save.dataset.saving = '0';
    els.save.disabled = false;
    els.save.textContent = currentStrings.settingsSave;
  }
});

init();
