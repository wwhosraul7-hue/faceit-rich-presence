/**
 * App-level preferences that aren't FACEIT/Discord config: UI language and
 * the FACEIT level badge color palette. Stored separately from .env in a
 * small JSON file next to it, so config-store.js stays focused on the
 * .env / .cfg pair.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  language: 'ro',
  badgePalette: 'orange',
};

const PALETTES = ['orange', 'blue', 'purple'];
const LANGUAGES = ['ro', 'en'];

function filePath(baseDir) {
  return path.join(baseDir, 'app-settings.json');
}

function load(baseDir) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath(baseDir), 'utf8'));
    return {
      language: LANGUAGES.includes(raw.language) ? raw.language : DEFAULTS.language,
      badgePalette: PALETTES.includes(raw.badgePalette) ? raw.badgePalette : DEFAULTS.badgePalette,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(baseDir, settings) {
  const current = load(baseDir);
  const merged = { ...current, ...settings };
  fs.writeFileSync(filePath(baseDir), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

module.exports = { load, save, DEFAULTS, PALETTES, LANGUAGES };
