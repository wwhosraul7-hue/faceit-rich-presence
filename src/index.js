/**
 * CLI entry point - runs the FACEIT Discord Rich Presence + CS2 GSI service
 * directly in the terminal (same behaviour as before it was split into
 * presence.js). For the tray-app / Start-Stop / autostart experience, see
 * main.js, packaged as a standalone .exe via `npm run dist`.
 */

'use strict';

const path = require('path');
const presence = require('./presence');

presence.on('status', (text) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${text}`);
});
presence.on('error', (err) => {
  console.error('Error:', err.message);
});

// __dirname is src/ - .env lives at the project root, one level up.
const configured = presence.configure(path.join(__dirname, '..'));
if (!configured) {
  console.error('Missing variables in .env (DISCORD_CLIENT_ID, FACEIT_API_KEY, FACEIT_NICKNAME).');
  process.exit(1);
}

presence.start();
