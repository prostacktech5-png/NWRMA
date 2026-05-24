const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// npm workspace: bundle from mobile/, not the repo root (see EXPO_NO_METRO_WORKSPACE_ROOT).
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
