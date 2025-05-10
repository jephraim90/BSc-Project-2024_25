// jest.config.js
module.exports = {
    preset: 'jest-expo',
    transformIgnorePatterns: [
      'node_modules/(?!(jest-)?react-native|@react-native|react-clone-referenced-element|@react-navigation|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|@sentry/.*)'
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    collectCoverageFrom: [
      '**/*.{js,jsx}',
      '!**/node_modules/**',
      '!**/coverage/**',
      '!**/android/**',
      '!**/ios/**',
      '!**/web-build/**'
    ],
  moduleNameMapper: {
  "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
  "^@/(.*)$": "<rootDir>/$1",
  "^react-native-vector-icons/(.*)$": "<rootDir>/__mocks__/vector-icons-mock.js"
}
  };