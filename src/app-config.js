/**
 * App-wide constants that depend on where this project's GitHub repo ends
 * up living - fill in GITHUB_REPO once the repo exists (see README).
 * Used for: checking for new versions (GitHub Releases) and hosting the
 * FACEIT logo + level badge images shown on Rich Presence (must be a
 * PUBLIC repo - raw.githubusercontent.com/api.github.com both 404 on
 * private repos without authentication).
 */

'use strict';

// e.g. 'wwhosraul7/faceit-rpc' - owner/repo, no URL, no trailing slash.
const GITHUB_REPO = 'wwhosraul7-hue/faceit-rich-presence';

function isGithubRepoConfigured() {
  return GITHUB_REPO !== 'CHANGEME/CHANGEME' && /^[^/\s]+\/[^/\s]+$/.test(GITHUB_REPO);
}

function rawAssetUrl(relativePath) {
  if (!isGithubRepoConfigured()) return null;
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/assets/${relativePath}`;
}

/** Real FACEIT skill level icon (1-10), sourced from the game's own files - see assets/README.md. */
function levelIconUrl(level) {
  return rawAssetUrl(`levels/level_${level}.png`);
}

/** The FACEIT flag mark, cropped square from FACEIT's official logo (Wikimedia, CC BY 4.0). */
function faceitLogoUrl() {
  return rawAssetUrl('faceit-logo.png');
}

module.exports = { GITHUB_REPO, isGithubRepoConfigured, levelIconUrl, faceitLogoUrl };
