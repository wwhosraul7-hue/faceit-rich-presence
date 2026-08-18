/**
 * Reads/writes the .env and the CS2 GSI .cfg file next to the app, so the
 * Settings window can be a simple form instead of asking people to edit
 * text files by hand.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Shared Discord Rich Presence application - baked in so people this app is
// handed to don't need to create their own app on discord.com/developers.
// Still overridable from the Settings window's "Avansat" section.
const DEFAULT_DISCORD_CLIENT_ID = '1529210955848745200';

function envPath(baseDir) {
  return path.join(baseDir, '.env');
}
function cfgPath(baseDir) {
  return path.join(baseDir, 'gamestate_integration_faceitrpc.cfg');
}

function parseEnvFile(baseDir) {
  const p = envPath(baseDir);
  if (!fs.existsSync(p)) return {};
  const content = fs.readFileSync(p, 'utf8');
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** Current values (from .env if present, sensible defaults otherwise). */
function loadSettings(baseDir) {
  const env = parseEnvFile(baseDir);
  return {
    discordClientId: env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_CLIENT_ID,
    faceitApiKey: env.FACEIT_API_KEY || '',
    faceitNickname: env.FACEIT_NICKNAME || '',
    pollIntervalSeconds: env.POLL_INTERVAL_SECONDS || '20',
    gsiPort: env.GSI_PORT || '3000',
    gsiAuthToken: env.GSI_AUTH_TOKEN || crypto.randomBytes(16).toString('hex'),
  };
}

/** Field-by-field validation; returns {} when everything's OK. */
function validate(s) {
  const errors = {};
  if (!/^\d+$/.test(String(s.discordClientId || '').trim())) {
    errors.discordClientId = 'Trebuie sa fie un numar (Application ID din Discord Developer Portal).';
  }
  if (!String(s.faceitApiKey || '').trim()) {
    errors.faceitApiKey = 'Completeaza cheia API FACEIT.';
  }
  if (!String(s.faceitNickname || '').trim()) {
    errors.faceitNickname = 'Completeaza nickname-ul tau exact de pe FACEIT.';
  }
  const poll = Number(s.pollIntervalSeconds);
  if (!Number.isFinite(poll) || poll < 5 || poll > 3600) {
    errors.pollIntervalSeconds = 'Intre 5 si 3600 secunde.';
  }
  const port = Number(s.gsiPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.gsiPort = 'Port invalid (1-65535).';
  }
  if (!String(s.gsiAuthToken || '').trim()) {
    errors.gsiAuthToken = 'Tokenul GSI nu poate fi gol.';
  }
  return errors;
}

function writeEnvFile(baseDir, s) {
  const content = `# Generat din interfata FaceitRPC (click-dreapta pe icon -> Configurare).
# Poti edita si manual daca vrei, dar la urmatoarea salvare din interfata va fi rescris.

# ID-ul aplicatiei Discord (Discord Developer Portal -> aplicatia -> General Information -> Application ID)
DISCORD_CLIENT_ID=${s.discordClientId}

# Cheia ta API de la FACEIT (Server-side / API Key) - de la https://developers.faceit.com/
FACEIT_API_KEY=${s.faceitApiKey}

# Nickname-ul tau exact de pe FACEIT
FACEIT_NICKNAME=${s.faceitNickname}

# La cate secunde se verifica statusul FACEIT (elo/nivel/ultimul meci).
POLL_INTERVAL_SECONDS=${s.pollIntervalSeconds}

# Portul pe care ruleaza serverul local care primeste date live de la CS2 (GSI).
GSI_PORT=${s.gsiPort}

# Token secret - generat automat, trebuie sa fie IDENTIC cu cel din
# gamestate_integration_faceitrpc.cfg (fisierul e regenerat automat cu acelasi token).
GSI_AUTH_TOKEN=${s.gsiAuthToken}
`;
  fs.writeFileSync(envPath(baseDir), content, 'utf8');
}

function writeGsiCfgFile(baseDir, s) {
  const content = `"FACEIT RPC GSI Config"
{
\t"uri" "http://127.0.0.1:${s.gsiPort}"
\t"timeout" "5.0"
\t"buffer"  "0.1"
\t"throttle" "0.5"
\t"heartbeat" "30.0"
\t"auth"
\t{
\t\t"token" "${s.gsiAuthToken}"
\t}
\t"data"
\t{
\t\t"provider"            "1"
\t\t"map"                 "1"
\t\t"round"               "1"
\t\t"player_id"           "1"
\t\t"player_state"        "1"
\t}
}
`;
  fs.writeFileSync(cfgPath(baseDir), content, 'utf8');
}

module.exports = {
  DEFAULT_DISCORD_CLIENT_ID,
  loadSettings,
  validate,
  writeEnvFile,
  writeGsiCfgFile,
  envPath,
  cfgPath,
};
