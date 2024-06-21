module.exports = {
  preset: '@basaldev/jest-preset',
  collectCoverageFrom: ['src/**/*.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['./src/tests/setup-tests.ts'],
};