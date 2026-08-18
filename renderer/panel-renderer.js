'use strict';

const els = {
  updateBanner: document.getElementById('update-banner'),
  updateText: document.getElementById('update-text'),
  appTitle: document.getElementById('app-title'),
  statusText: document.getElementById('status-text'),
  langButtons: Array.from(document.querySelectorAll('.lang-btn')),
  toggleBtn: document.getElementById('toggle-btn'),
  toggleLabel: document.getElementById('toggle-label'),
  eloChart: document.getElementById('elo-chart'),
  eloChartLabel: document.getElementById('elo-chart-label'),
  eloChartValue: document.getElementById('elo-chart-value'),
  sparklineLine: document.getElementById('elo-sparkline-line'),
  sparklineDot: document.getElementById('elo-sparkline-dot'),
  rowSettings: document.getElementById('row-settings'),
  rowSettingsLabel: document.getElementById('row-settings-label'),
  rowAutolaunchLabel: document.getElementById('row-autolaunch-label'),
  autolaunchCheckbox: document.getElementById('autolaunch-checkbox'),
  rowSoundLabel: document.getElementById('row-sound-label'),
  soundCheckbox: document.getElementById('sound-checkbox'),
  rowFolder: document.getElementById('row-folder'),
  rowFolderLabel: document.getElementById('row-folder-label'),
  quitLink: document.getElementById('quit-link'),
};

const sounds = {
  start: new Audio('../assets/sounds/start.wav'),
  stop: new Audio('../assets/sounds/stop.wav'),
};

function playSound(name) {
  try {
    const audio = sounds[name];
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // ignore - sound is a nice-to-have, never block Start/Stop on it
  }
}

function renderEloChart(history) {
  const points = Array.isArray(history) ? history.slice(-20) : [];
  if (points.length < 2) {
    els.eloChart.classList.remove('visible');
    return;
  }
  els.eloChart.classList.add('visible');

  const values = points.map((p) => p.elo);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 280;
  const height = 40;
  const padY = 4;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
    const y = height - padY - ((p.elo - min) / range) * (height - padY * 2);
    return [x, y];
  });

  els.sparklineLine.setAttribute('points', coords.map(([x, y]) => `${x},${y}`).join(' '));

  const [lastX, lastY] = coords[coords.length - 1];
  els.sparklineDot.setAttribute('cx', lastX);
  els.sparklineDot.setAttribute('cy', lastY);

  const latest = points[points.length - 1];
  const trendDiff = latest.diff;
  els.eloChartValue.textContent = `${latest.elo} ELO`;
  els.eloChartValue.classList.remove('up', 'down');
  if (trendDiff > 0) els.eloChartValue.classList.add('up');
  else if (trendDiff < 0) els.eloChartValue.classList.add('down');
}

function render(state) {
  const s = state.strings;

  els.appTitle.textContent = s.appName;
  els.statusText.textContent = state.status;
  els.rowSettingsLabel.textContent = s.panelSettings;
  els.rowAutolaunchLabel.textContent = s.panelAutoLaunch;
  els.rowSoundLabel.textContent = s.panelSound;
  els.eloChartLabel.textContent = s.panelEloChart;
  els.rowFolderLabel.textContent = s.panelOpenFolder;
  els.quitLink.textContent = s.panelQuit;

  els.langButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === state.language);
  });

  els.toggleLabel.textContent = state.running ? s.panelStop : s.panelStart;
  els.toggleBtn.classList.toggle('running', state.running);
  els.toggleBtn.disabled = !state.configured && !state.running;

  els.autolaunchCheckbox.checked = state.autoLaunch;
  els.soundCheckbox.checked = state.soundEnabled;

  renderEloChart(state.eloHistory);

  if (state.update && state.update.available) {
    els.updateBanner.classList.add('visible');
    els.updateText.textContent = `${s.panelUpdateAvailable} (v${state.update.latestVersion})`;
  } else {
    els.updateBanner.classList.remove('visible');
  }

  // Tell main to snugly resize the window to the actual card height (the
  // update banner, ELO chart and other bits change height depending on state).
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
    if (currentState.soundEnabled) playSound('stop');
    window.panelApi.stop();
  } else {
    if (currentState.soundEnabled) playSound('start');
    window.panelApi.start();
  }
});

els.rowSettings.addEventListener('click', () => window.panelApi.openSettings());
els.rowFolder.addEventListener('click', () => window.panelApi.openFolder());
els.quitLink.addEventListener('click', () => window.panelApi.quit());

els.autolaunchCheckbox.addEventListener('change', (event) => {
  window.panelApi.toggleAutoLaunch(event.target.checked);
});

els.soundCheckbox.addEventListener('change', (event) => {
  window.panelApi.toggleSound(event.target.checked);
});

els.langButtons.forEach((btn) => {
  btn.addEventListener('click', () => window.panelApi.setLanguage(btn.dataset.lang));
});

els.updateBanner.addEventListener('click', (event) => {
  event.preventDefault();
  window.panelApi.openUpdate();
});

init();
