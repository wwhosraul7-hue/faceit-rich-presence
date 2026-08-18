/**
 * FACEIT Discord Rich Presence + CS2 Game State Integration (GSI)
 * -----------------------------------------------------------------
 * Core logic, extracted as a reusable module so it can be driven either
 * directly from the terminal (index.js) or from the Electron tray app
 * (main.js), with Start/Stop control.
 *
 * Runs LOCALLY, with the Discord desktop app open (uses IPC, does not
 * work on a server).
 */

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const EventEmitter = require('events');
const dotenv = require('dotenv');
const RPC = require('discord-rpc');
const { levelIconUrl, faceitLogoUrl } = require('./app-config');

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// The FACEIT logo (square crop of the official mark) and per-level icons are
// hosted on this project's own GitHub repo (see assets/), not a third-party
// domain - Discord's Rich Presence image resolver only reliably renders
// large-image URLs when the image is actually square-ish; the original wide
// banner logo showed up as cropped letter fragments instead of the icon.
const FACEIT_LOGO_URL = faceitLogoUrl();

// Map images source: https://github.com/MurkyYT/cs2-map-icons - auto-updated from the
// CS2 game files, official Valve images.
function mapImage(mapName) {
  if (!mapName) return FACEIT_LOGO_URL;
  return `https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/${mapName}.png`;
}

function phaseLabel(phase) {
  switch (phase) {
    case 'warmup':
      return 'Warmup';
    case 'live':
      return 'Match in progress';
    case 'intermission':
      return 'Halftime break';
    case 'gameover':
      return 'Match finished';
    default:
      return 'In-game';
  }
}

class PresenceService extends EventEmitter {
  constructor() {
    super();
    // Real value always comes from configure(baseDir) before use - this is
    // just a harmless default (src/ -> project root).
    this.baseDir = path.join(__dirname, '..');
    this.cacheFile = path.join(this.baseDir, 'cache.json');
    this.config = null;
    this.client = null;
    this.gsiServer = null;
    this.pollTimer = null;
    this.reconnectTimer = null;
    this.latestGsi = null;
    this._lastGsiSignature = undefined;
    this._lastForcedUpdateAt = 0;
    this.running = false;
    this.startTimestamp = null;
    this.lastStatusText = 'Stopped';
  }

  /** Point the service at the folder holding .env / cache.json, and (re)load config. */
  configure(baseDir) {
    this.baseDir = baseDir || this.baseDir;
    // force: true so restarting after editing .env on disk picks up the new values.
    dotenv.config({ path: path.join(this.baseDir, '.env'), override: true });

    const {
      DISCORD_CLIENT_ID,
      FACEIT_API_KEY,
      FACEIT_NICKNAME,
      POLL_INTERVAL_SECONDS = '20',
      GSI_PORT = '3000',
      GSI_AUTH_TOKEN = 'change-this-token',
    } = process.env;

    this.config = {
      DISCORD_CLIENT_ID,
      FACEIT_API_KEY,
      FACEIT_NICKNAME,
      POLL_MS: Number(POLL_INTERVAL_SECONDS) * 1000,
      GSI_PORT: Number(GSI_PORT),
      GSI_AUTH_TOKEN,
    };
    this.cacheFile = path.join(this.baseDir, 'cache.json');
    return this.isConfigured();
  }

  isConfigured() {
    return !!(
      this.config &&
      this.config.DISCORD_CLIENT_ID &&
      this.config.FACEIT_API_KEY &&
      this.config.FACEIT_NICKNAME
    );
  }

  isRunning() {
    return this.running;
  }

  _setStatus(text) {
    this.lastStatusText = text;
    this.emit('status', text);
  }

  _log(...args) {
    console.log(...args);
    this.emit('log', args.join(' '));
  }

  // ---------- GSI server (receives live data from CS2) ----------
  _startGsiServer() {
    const server = http.createServer((req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405).end();
        return;
      }
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        res.writeHead(200).end();
        try {
          const payload = JSON.parse(body);
          const token = this.config.GSI_AUTH_TOKEN;
          if (token && payload?.auth?.token !== token) return; // wrong token, ignore

          const map = payload.map;
          const player = payload.player;
          if (!map || !map.name) {
            this.latestGsi = null; // not on any map (main menu etc.)
            this._maybeForceUpdate('none');
            return;
          }

          const side = player?.team; // "CT" or "T"
          const scoreCt = map.team_ct?.score ?? 0;
          const scoreT = map.team_t?.score ?? 0;
          const scoreUs = side === 'T' ? scoreT : scoreCt;
          const scoreThem = side === 'T' ? scoreCt : scoreT;

          this.latestGsi = {
            map: map.name,
            phase: map.phase, // warmup | live | intermission | gameover
            scoreUs,
            scoreThem,
            side,
            updatedAt: Date.now(),
          };

          // Don't wait for the next poll tick to reflect a new match/round -
          // push right away when something visible actually changed (a new
          // map means "started a new match right after the last one"), but
          // debounced so a burst of GSI packets can't spam the FACEIT API.
          this._maybeForceUpdate(`${map.name}|${map.phase}|${scoreUs}-${scoreThem}`);
        } catch {
          // malformed packet, ignore
        }
      });
    });

    server.on('error', (err) => {
      this._log('GSI server error:', err.message);
      this.emit('error', err);
    });

    server.listen(this.config.GSI_PORT, () => {
      this._log(`Local GSI server started on port ${this.config.GSI_PORT}, waiting for data from CS2...`);
    });

    this.gsiServer = server;
  }

  /** Push a fresh Discord activity right away when the GSI state actually changed (min 3s apart). */
  _maybeForceUpdate(signature) {
    if (!this.running || !this.client) return;
    if (signature === this._lastGsiSignature) return;
    this._lastGsiSignature = signature;

    const FORCE_UPDATE_MIN_GAP_MS = 3000;
    const now = Date.now();
    if (now - this._lastForcedUpdateAt < FORCE_UPDATE_MIN_GAP_MS) return;
    this._lastForcedUpdateAt = now;

    this._updatePresence();
  }

  _getLiveGsiState() {
    // only trust GSI data if it arrived in the last 60 seconds
    if (this.latestGsi && Date.now() - this.latestGsi.updatedAt < 60 * 1000) return this.latestGsi;
    return null;
  }

  // ---------- local cache (so we know the ELO from the last check) ----------
  _loadCache() {
    try {
      const cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      if (!Array.isArray(cache.eloHistory)) cache.eloHistory = [];
      return cache;
    } catch {
      return { lastElo: null, lastMatchId: null, lastMatchEloDiff: null, eloHistory: [] };
    }
  }
  _saveCache(data) {
    fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
  }

  /** Last up to 20 {elo, diff, matchId, timestamp} points, oldest first - for the panel sparkline. */
  getEloHistory() {
    return this._loadCache().eloHistory;
  }

  // ---------- FACEIT API ----------
  async _getPlayer(nickname) {
    const res = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`,
      { headers: { Authorization: `Bearer ${this.config.FACEIT_API_KEY}` } }
    );
    if (!res.ok) throw new Error(`Player fetch failed: ${res.status}`);
    return res.json();
  }

  async _getLastMatch(playerId) {
    const res = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=1`,
      { headers: { Authorization: `Bearer ${this.config.FACEIT_API_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.items?.[0] || null;
  }

  async _getMatchDetails(matchId) {
    const res = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${this.config.FACEIT_API_KEY}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  _roomUrl(match) {
    if (!match?.faceitUrl) return null;
    return match.faceitUrl.replace('{lang}', 'en');
  }

  _profileUrl() {
    return `https://www.faceit.com/en/players/${encodeURIComponent(this.config.FACEIT_NICKNAME)}`;
  }

  // ---------- building the Discord activity ----------
  async _buildActivity(cache) {
    const playerData = await this._getPlayer(this.config.FACEIT_NICKNAME);
    const cs2 = playerData.games?.cs2 || playerData.games?.csgo;
    if (!cs2) throw new Error('Could not find CS2 data for this nickname.');

    const level = cs2.skill_level;
    const elo = cs2.faceit_elo;

    const lastMatch = await this._getLastMatch(playerData.player_id);

    if (lastMatch && lastMatch.match_id !== cache.lastMatchId) {
      const diff = cache.lastElo != null ? elo - cache.lastElo : null;
      if (diff != null) {
        cache.lastMatchEloDiff = diff;
      }
      cache.lastMatchId = lastMatch.match_id;

      cache.eloHistory.push({ elo, diff, matchId: lastMatch.match_id, timestamp: Date.now() });
      if (cache.eloHistory.length > 20) cache.eloHistory = cache.eloHistory.slice(-20);

      // Only notify when there's an actual before/after to compare (not on the very first run).
      if (diff != null && diff !== 0) {
        this.emit('elo-change', { diff, elo, level });
      }
    }
    cache.lastElo = elo;
    this._saveCache(cache);

    let eloDiffText = '';
    if (cache.lastMatchEloDiff != null && cache.lastMatchEloDiff !== 0) {
      eloDiffText = cache.lastMatchEloDiff > 0 ? ` (+${cache.lastMatchEloDiff})` : ` (${cache.lastMatchEloDiff})`;
    }

    const baseActivity = {
      details: `Level ${level} · ${elo} ELO${eloDiffText}`,
      startTimestamp: this.startTimestamp,
    };

    // Small corner badge on the large image, showing the real FACEIT skill level icon.
    // No-op (undefined) until GITHUB_REPO is configured in app-config.js.
    const clampedLevel = Math.min(10, Math.max(1, Number(level) || 1));
    const badge = levelIconUrl(clampedLevel);
    if (badge) {
      baseActivity.smallImageKey = badge;
      baseActivity.smallImageText = `Level ${level}`;
    }

    // Discord allows at most 2 buttons - "Profil FACEIT" is always one of them.
    const profileButton = { label: 'Profil FACEIT', url: this._profileUrl() };

    const live = this._getLiveGsiState();
    if (live) {
      return {
        ...baseActivity,
        state: `${phaseLabel(live.phase)} · ${live.scoreUs} - ${live.scoreThem}`,
        largeImageKey: mapImage(live.map),
        largeImageText: live.map,
        buttons: [profileButton],
      };
    }

    if (!lastMatch) {
      return {
        ...baseActivity,
        state: 'Idle',
        largeImageKey: FACEIT_LOGO_URL,
        largeImageText: 'FACEIT',
        buttons: [profileButton],
      };
    }

    const finishedAt = lastMatch.finished_at; // epoch seconds
    const isRecent = finishedAt && Date.now() / 1000 - finishedAt < 15 * 60;

    if (!isRecent) {
      return {
        ...baseActivity,
        state: 'Idle',
        largeImageKey: FACEIT_LOGO_URL,
        largeImageText: 'FACEIT',
        buttons: [profileButton],
      };
    }

    const details = await this._getMatchDetails(lastMatch.match_id);
    const url = this._roomUrl(details) || lastMatch.faceit_url?.replace('{lang}', 'en');
    const mapKey = details?.voting?.map?.pick?.[0] || lastMatch.map?.replace(/\s+/g, '_').toLowerCase();
    const scoreRaw = details?.results?.score || {};
    const scoreText = scoreRaw.faction1 != null ? `${scoreRaw.faction1} - ${scoreRaw.faction2}` : '';

    return {
      ...baseActivity,
      state: scoreText ? `Last match: ${scoreText}` : 'Last match finished',
      largeImageKey: mapImage(mapKey),
      largeImageText: mapKey || 'FACEIT',
      buttons: url ? [{ label: 'Camera de meci', url }, profileButton] : [profileButton],
    };
  }

  async _updatePresence() {
    if (!this.running || !this.client) return;
    try {
      const cache = this._loadCache();
      const activity = await this._buildActivity(cache);
      await this.client.setActivity(activity);
      const text = `${activity.details} | ${activity.state}`;
      this._setStatus(text);
      this._log(`[${new Date().toLocaleTimeString()}] Presence updated:`, activity.details, '|', activity.state);
    } catch (err) {
      this._log('Error updating presence:', err.message);
      this.emit('error', err);
    }
  }

  // ---------- lifecycle ----------
  // Reconnect delay for when Discord isn't open yet - matters most right after
  // Windows boot, since our app can start before Discord has finished launching.
  static RECONNECT_MS = 15 * 1000;

  start() {
    if (this.running) return;
    if (!this.isConfigured()) {
      this._setStatus('Config lipsa (.env)');
      this.emit(
        'error',
        new Error('Missing DISCORD_CLIENT_ID / FACEIT_API_KEY / FACEIT_NICKNAME in .env')
      );
      return;
    }

    this.running = true;
    this.startTimestamp = new Date();
    this._startGsiServer();
    this._connectClient();
  }

  /** (Re)tries the Discord IPC connection; keeps retrying every 15s while running. */
  _connectClient() {
    if (!this.running) return;
    this._setStatus('Se conecteaza la Discord...');

    const client = new RPC.Client({ transport: 'ipc' });
    this.client = client;

    const scheduleRetry = () => {
      if (this.client !== client) return; // a newer attempt already replaced this one
      this.client = null;
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      if (!this.running) return;
      this._setStatus('Discord nu ruleaza - reincerc...');
      this.reconnectTimer = setTimeout(() => this._connectClient(), PresenceService.RECONNECT_MS);
    };

    client.on('ready', () => {
      if (this.client !== client) return;
      this._log(`Connected to Discord as application ${this.config.DISCORD_CLIENT_ID}. Starting updates...`);
      this._updatePresence();
      this.pollTimer = setInterval(() => this._updatePresence(), this.config.POLL_MS);
    });

    client.on('disconnected', () => {
      if (this.client !== client) return;
      if (!this.running) return; // stop() closed this on purpose - nothing to retry
      this._log('Discord connection lost. Retrying...');
      scheduleRetry();
    });

    client.login({ clientId: this.config.DISCORD_CLIENT_ID }).catch((err) => {
      if (this.client !== client) return;
      this._log('Could not connect to the local Discord client. Is Discord open? Retrying...', err.message);
      scheduleRetry();
    });
  }

  async stop() {
    if (!this.running) return;
    this.running = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.gsiServer) {
      try {
        this.gsiServer.close();
      } catch {
        /* ignore */
      }
      this.gsiServer = null;
    }
    if (this.client) {
      try {
        await this.client.clearActivity();
      } catch {
        /* ignore */
      }
      try {
        await this.client.destroy();
      } catch {
        /* ignore */
      }
      this.client = null;
    }
    this._setStatus('Stopped');
  }
}

module.exports = new PresenceService();
