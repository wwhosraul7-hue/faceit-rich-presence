/**
 * Best-effort auto-detection of the CS2 "csgo/cfg" folder(s), so the
 * Settings window can offer a one-click "install the GSI file into CS2"
 * button instead of asking people to find the folder themselves.
 *
 * Windows-only (reads the Steam install path from the registry). Never
 * throws - callers get an empty array if anything can't be found.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function readRegistryValue(key, value) {
  try {
    const out = execFileSync('reg', ['query', key, '/v', value], { encoding: 'utf8' });
    const re = new RegExp(`${value}\\s+REG_SZ\\s+(.+)`);
    const m = out.match(re);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function findSteamPath() {
  return (
    readRegistryValue('HKCU\\Software\\Valve\\Steam', 'SteamPath') ||
    readRegistryValue('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath') ||
    readRegistryValue('HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath')
  );
}

/** All Steam library folders (the main install + any extra drives added in Steam settings). */
function findLibraryFolders(steamPath) {
  const libs = [steamPath];
  const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
  try {
    const content = fs.readFileSync(vdfPath, 'utf8');
    const re = /"path"\s+"([^"]+)"/g;
    let m;
    while ((m = re.exec(content))) {
      const libPath = m[1].replace(/\\\\/g, '\\');
      if (!libs.includes(libPath)) libs.push(libPath);
    }
  } catch {
    // no libraryfolders.vdf (old Steam?) - just use the main install path
  }
  return libs;
}

/** Returns every existing "<library>/steamapps/common/.../game/csgo/cfg" folder found. */
function findCs2CfgFolders() {
  const steamPath = findSteamPath();
  if (!steamPath) return [];

  const results = [];
  for (const lib of findLibraryFolders(steamPath)) {
    const cfgDir = path.join(
      lib,
      'steamapps',
      'common',
      'Counter-Strike Global Offensive',
      'game',
      'csgo',
      'cfg'
    );
    if (fs.existsSync(cfgDir)) results.push(cfgDir);
  }
  return results;
}

module.exports = { findSteamPath, findLibraryFolders, findCs2CfgFolders };
