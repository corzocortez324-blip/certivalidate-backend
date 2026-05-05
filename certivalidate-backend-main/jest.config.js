module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/helpers/'],
  testTimeout: 20000,
  verbose: true,
  globalTeardown: '<rootDir>/tests/global-teardown.js',
}
