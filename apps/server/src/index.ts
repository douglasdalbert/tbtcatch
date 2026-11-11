import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { loadAppConfig } from "../../../scripts/env";

const config = loadAppConfig();
const port = config.port;
const webDirectory = fileURLToPath(new URL("../../web/dist", import.meta.url));
const { http, io } = createApp(webDirectory);
http.listen(port, "0.0.0.0", () => {
  console.log(`Servidor ${config.isProduction ? "em produção" : "fora de produção"}: http://localhost:${port}`);
  console.log(`Configuração de jogo: ${config.gymCount} ginásios.`);
});
http.on("error", (error) => {
  console.error("Não foi possível iniciar o servidor:", error);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => io.close(() => process.exit(0)));
}
