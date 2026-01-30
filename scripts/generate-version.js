#!/usr/bin/env node

/**
 * Generates a version.json file with the current build timestamp
 * This file is used to detect when a new version of the app is deployed
 */

const fs = require('fs');
const path = require('path');

const version = {
  buildTime: new Date().toISOString(),
  buildTimestamp: Date.now(),
};

const publicDir = path.join(process.cwd(), 'public');
const versionFile = path.join(publicDir, 'version.json');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write version file
fs.writeFileSync(versionFile, JSON.stringify(version, null, 2), 'utf8');

console.log(`✓ Generated version.json: ${version.buildTime}`);
