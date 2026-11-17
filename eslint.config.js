const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'coverage/**', 'src/content/campaigns/**'],
  },
]);
