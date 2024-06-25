module.exports = {
  preset: '@basaldev/jest-preset',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    "<rootDir>/src/tests",
  ],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['./src/tests/setup-tests.ts'],
};