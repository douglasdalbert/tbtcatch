import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadAppConfig } from "../../../scripts/env";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadAppConfig", () => {
  it("uses local values, external values, and example defaults for missing settings", () => {
    const directory = mkdtempSync(join(tmpdir(), "terra-env-"));
    temporaryDirectories.push(directory);
    writeFileSync(join(directory, ".env.example"), [
      "NODE_ENV=development",
      "GAME_GYM_COUNT=2",
      "GAME_TYPE_BONUS=0.1",
      "PORT=3000",
      "WEB_PORT=5173",
    ].join("\n"));
    writeFileSync(join(directory, ".env"), [
      "NODE_ENV=production",
      "GAME_GYM_COUNT=3",
      "GAME_TYPE_BONUS=0.25",
      "WEB_PORT=",
    ].join("\n"));

    const environment: NodeJS.ProcessEnv = { PORT: "3100", GAME_GYM_COUNT: "" };
    const config = loadAppConfig(directory, environment);

    expect(config).toMatchObject({
      nodeEnv: "production",
      isProduction: true,
      gymCount: 3,
      typeBonus: 0.25,
      port: 3100,
      webPort: 5173,
    });
  });
});
