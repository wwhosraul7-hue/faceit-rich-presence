/**
 * App-wide constants that depend on where this project's GitHub repo ends
 * up living - fill in GITHUB_REPO once the repo exists (see README).
 * Used for: checking for new versions (GitHub Releases) and hosting the
 * FACEIT level badge images shown on Rich Presence.
 */

'use strict';

// e.g. 'wwhosraul7/faceit-rpc' - owner/repo, no URL, no trailing slash.
const GITHUB_REPO = 'wwhosraul7-hue/faceit-rich-presence';

function isGithubRepoConfigured() {
  return GITHUB_REPO !== 'CHANGEME/CHANGEME' && /^[^/\s]+\/[^/\s]+$/.test(GITHUB_REPO);
}

function badgeUrl(palette, level) {
  if (!isGithubRepoConfigured()) return null;
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/assets/badges/${palette}/level_${level}.png`;
}

module.exports = { GITHUB_REPO, isGithubRepoConfigured, badgeUrl };
