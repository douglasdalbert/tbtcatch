import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import { Server } from "socket.io";
import type { ClientEvents, ServerEvents } from "@catch/shared";
import { RoomService } from "./room";

export function createApp(webDirectory?: string) {
  const app = express();
  const http = createServer(app);
  const io = new Server<ClientEvents, ServerEvents>(http, {
    maxHttpBufferSize: 16_384,
    pingInterval: 10_000,
    pingTimeout: 5_000,
  });
  const rooms = new RoomService(
    (ids, snapshot) => {
      ids.forEach((id) => io.to(id).emit("snapshot", snapshot));
      io.emit("availability", snapshot?.id ?? null);
    },
    (id) => {
      io.to(id).emit("replaced");
      io.sockets.sockets.get(id)?.disconnect(true);
    },
  );
  app.get("/api/health", (_request, response) => response.json({ ok: true }));
  app.get("/api/network", (_request, response) => {
    const addresses = Object.values(networkInterfaces()).flatMap((entries) =>
      (entries ?? []).filter((entry) => entry.family === "IPv4" && !entry.internal).map((entry) => entry.address));
    response.json({ addresses: [...new Set(addresses)] });
  });
  io.on("connection", (socket) => {
    socket.emit("availability", rooms.snapshot()?.id ?? null);
    socket.on("command", (input, acknowledge) => {
      if (typeof acknowledge !== "function") return;
      try {
        acknowledge(rooms.execute(socket.id, input));
      } catch (error) {
        console.error("Falha ao processar comando da sala:", error);
        acknowledge({ ok: false, code: "INTERNAL_ERROR", error: "Erro no servidor. Consulte o terminal do notebook." });
      }
    });
    socket.on("disconnect", () => rooms.disconnect(socket.id));
  });
  if (webDirectory && existsSync(resolve(webDirectory, "index.html"))) {
    app.use(express.static(webDirectory));
    app.get("/{*path}", (_request, response) => response.sendFile(resolve(webDirectory, "index.html")));
  }
  return { http, io, rooms };
}
