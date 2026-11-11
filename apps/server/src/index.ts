import { fileURLToPath } from "node:url";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT deve ser uma porta válida.");
const webDirectory = fileURLToPath(new URL("../../web/dist", import.meta.url));
const { http, io } = createApp(webDirectory);
http.listen(port, "0.0.0.0", () => {
  console.log(`Servidor local: http://localhost:${port}`);
});
http.on("error", (error) => {
  console.error("Não foi possível iniciar o servidor:", error);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => io.close(() => process.exit(0)));
}
