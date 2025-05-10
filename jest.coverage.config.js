// Coverage configuration for Jest
const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/android/**',
    '!**/ios/**',
    '!**/web-build/**',
    '!**/babel.config.js',
    '!**/jest.*.js',
    '!**/metro.config.js',
    '!**/webpack.config.js',
    '!**/app.config.js',
    '!**/eas.json',
    '!**/.eslintrc.js'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    './components/': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    './services/': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    }
  }
};