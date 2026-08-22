export default {
  testEnvironment: "node",

  transform: {},

  setupFilesAfterEnv: [
    "<rootDir>/tests/setup.js",
  ],

  testMatch: [
    "<rootDir>/tests/**/*.test.js",
  ],

  clearMocks: true,

  testTimeout: 30000,

  verbose: true,

  maxWorkers: 1,
};