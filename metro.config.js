const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Reset sourceExts to not include wasm, and only add it to assetExts
config.resolver.assetExts.push('wasm');

module.exports = config;
