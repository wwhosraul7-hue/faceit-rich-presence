/**
 * App-level preferences that aren't FACEIT/Discord config: just the UI
 * language for now. Stored separately from .env in a small JSON file next
 * to it, so config-store.js stays focused on the .env / .cfg pair.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  language: 'ro',
};

const LANGUAGES = ['ro', 'en'];

function filePath(baseDir) {
  return path.join(baseDir, 'app-settings.json');
}

function load(baseDir) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath(baseDir), 'utf8'));
    return {
      language: LANGUAGES.includes(raw.language) ? raw.language : DEFAULTS.language,
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

module.exports = { load, save, DEFAULTS, LANGUAGES };
