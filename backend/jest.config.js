/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.spec.ts"],
  // 既有的 __test__/ 目錄是手動 console.log 風格 script，非 Jest 規格 — 排除
  testPathIgnorePatterns: ["/node_modules/", "/__test__/"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  collectCoverageFrom: [
    "**/*.ts",
    "!**/*.d.ts",
    "!index.ts",
    "!seeds/**",
    "!__test__/**",
  ],
  testTimeout: 30000,
};
