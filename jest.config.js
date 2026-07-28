/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^uuid$": "<rootDir>/tests/setup/uuid-shim.js",
  },
  testTimeout: 30000,
  clearMocks: true,
  collectCoverageFrom: [
    "src/controllers/**/*.ts",
    "src/services/**/*.ts",
    "src/repositories/**/*.ts",
    "src/middlewares/**/*.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
};
