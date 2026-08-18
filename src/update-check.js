/**
 * Simple "is there a new version?" check against GitHub Releases - no
 * silent download/replace, just a yes/no + link, shown in the tray panel.
 */

'use strict';

const { GITHUB_REPO, isGithubRepoConfigured } = require('./app-config');

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

function parseVersion(v) {
  return String(v)
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
}

/** true if `latest` is a strictly newer version than `current`. */
function isNewer(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

/**
 * @param {string} currentVersion - e.g. app.getVersion()
 * @returns {Promise<{checked:boolean, available:boolean, latestVersion?:string, url?:string, reason?:string}>}
 */
async function checkForUpdate(currentVersion) {
  if (!isGithubRepoConfigured()) {
    return { checked: false, available: false, reason: 'not-configured' };
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'faceit-rpc-app' },
    });
    if (!res.ok) return { checked: false, available: false, reason: `http-${res.status}` };
    const data = await res.json();
    const rawTag = data.tag_name || data.name;
    if (!rawTag) return { checked: false, available: false, reason: 'no-tag' };
    return {
      checked: true,
      available: isNewer(rawTag, currentVersion),
      latestVersion: rawTag.replace(/^v/i, ''),
      url: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
    };
  } catch (err) {
    return { checked: false, available: false, reason: err.message };
  }
}

module.exports = { checkForUpdate, isNewer, parseVersion };
