module.exports = {
  preset: '@basaldev/jest-preset',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    "<rootDir>/src/tests",
  ],
  testMatch: ['**/tests/**/*.test.ts'],
};