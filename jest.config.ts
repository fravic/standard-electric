import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1",
  },
  transform: {},
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};

export default config;
