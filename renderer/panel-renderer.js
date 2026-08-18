'use strict';

const els = {
  updateBanner: document.getElementById('update-banner'),
  updateText: document.getElementById('update-text'),
  appTitle: document.getElementById('app-title'),
  statusText: document.getElementById('status-text'),
  langButtons: Array.from(document.querySelectorAll('.lang-btn')),
  toggleBtn: document.getElementById('toggle-btn'),
  toggleLabel: document.getElementById('toggle-label'),
  rowSettings: document.getElementById('row-settings'),
  rowSettingsLabel: document.getElementById('row-settings-label'),
  rowAutolaunchLabel: document.getElementById('row-autolaunch-label'),
  autolaunchCheckbox: document.getElementById('autolaunch-checkbox'),
  rowFolder: document.getElementById('row-folder'),
  rowFolderLabel: document.getElementById('row-folder-label'),
  quitLink: document.getElementById('quit-link'),
};

function render(state) {
  const s = state.strings;

  els.appTitle.textContent = s.appName;
  els.statusText.textContent = state.status;
  els.rowSettingsLabel.textContent = s.panelSettings;
  els.rowAutolaunchLabel.textContent = s.panelAutoLaunch;
  els.rowFolderLabel.textContent = s.panelOpenFolder;
  els.quitLink.textContent = s.panelQuit;

  els.langButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === state.language);
  });

  els.toggleLabel.textContent = state.running ? s.panelStop : s.panelStart;
  els.toggleBtn.classList.toggle('running', state.running);
  els.toggleBtn.disabled = !state.configured && !state.running;

  els.autolaunchCheckbox.checked = state.autoLaunch;

  if (state.update && state.update.available) {
    els.updateBanner.classList.add('visible');
    els.updateText.textContent = `${s.panelUpdateAvailable} (v${state.update.latestVersion})`;
  } else {
    els.updateBanner.classList.remove('visible');
  }

  // Tell main to snugly resize the window to the actual card height (the
  // update banner and other bits change height depending on state).
  requestAnimationFrame(() => {
    const card = document.querySelector('.card');
    window.panelApi.reportHeight(card.getBoundingClientRect().height);
  });
}

let currentState = null;

async function init() {
  currentState = await window.panelApi.getState();
  render(currentState);
}

window.panelApi.onState((state) => {
  currentState = state;
  render(state);
});

els.toggleBtn.addEventListener('click', () => {
  if (!currentState) return;
  if (currentState.running) {
    window.panelApi.stop();
  } else {
    window.panelApi.start();
  }
});

els.rowSettings.addEventListener('click', () => window.panelApi.openSettings());
els.rowFolder.addEventListener('click', () => window.panelApi.openFolder());
els.quitLink.addEventListener('click', () => window.panelApi.quit());

els.autolaunchCheckbox.addEventListener('change', (event) => {
  window.panelApi.toggleAutoLaunch(event.target.checked);
});

els.langButtons.forEach((btn) => {
  btn.addEventListener('click', () => window.panelApi.setLanguage(btn.dataset.lang));
});

els.updateBanner.addEventListener('click', (event) => {
  event.preventDefault();
  window.panelApi.openUpdate();
});

init();
