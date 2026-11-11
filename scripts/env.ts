import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseEnv } from "node:util";

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  gymCount: number;
  typeBonus: number;
  port: number;
  webPort: number;
}

function findProjectRoot(startDirectory: string): string {
  let directory = resolve(startDirectory);
  while (true) {
    if (existsSync(resolve(directory, ".env.example"))) return directory;
    const parent = dirname(directory);
    if (parent === directory) throw new Error("Não foi possível localizar o arquivo .env.example.");
    directory = parent;
  }
}

function readEnvFile(path: string): Record<string, string | undefined> {
  return existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
}

function readPositiveInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }
  return parsed;
}

function readFraction(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`${name} deve ser um número entre 0 e 1.`);
  }
  return parsed;
}

function readPort(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} deve ser uma porta válida.`);
  }
  return parsed;
}

export function loadAppConfig(
  rootDirectory = findProjectRoot(process.cwd()),
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const defaults = readEnvFile(resolve(rootDirectory, ".env.example"));
  const local = readEnvFile(resolve(rootDirectory, ".env"));
  const values = { ...defaults };
  for (const [name, value] of Object.entries(local)) {
    if (value) values[name] = value;
  }
  for (const [name, value] of Object.entries(values)) {
    const configValue = value || defaults[name];
    if (!environment[name] && configValue) environment[name] = configValue;
  }

  const nodeEnv = environment.NODE_ENV;
  if (!nodeEnv) throw new Error("NODE_ENV deve estar definido em .env.example.");

  const port = readPort(environment.PORT, "PORT");
  const webPort = readPort(environment.WEB_PORT, "WEB_PORT");
  if (port === webPort) throw new Error("PORT e WEB_PORT devem ser diferentes.");

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    gymCount: readPositiveInteger(environment.GAME_GYM_COUNT, "GAME_GYM_COUNT"),
    typeBonus: readFraction(environment.GAME_TYPE_BONUS, "GAME_TYPE_BONUS"),
    port,
    webPort,
  };
}
