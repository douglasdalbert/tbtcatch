import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  credentialsSchema,
  type ClientEvents,
  type Command,
  type Credentials,
  type Reply,
  type RoomSnapshot,
  type ServerEvents,
} from "@catch/shared";

type Role = Credentials["role"];

export function useSession(role: Role) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [availableId, setAvailableId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const credentials = useRef<Credentials | null>(null);
  const key = `catch-session-${role}`;

  function remember(value: Credentials | null) {
    credentials.current = value;
    setPlayerId(value?.playerId ?? null);
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch (cause) {
      console.error("Falha ao armazenar sessão:", cause);
      setError("O navegador bloqueou o armazenamento. Não feche esta aba: a reconexão após recarregar não será possível.");
    }
  }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = credentialsSchema.safeParse(JSON.parse(saved));
        if (parsed.success && parsed.data.role === role) credentials.current = parsed.data;
        else {
          sessionStorage.removeItem(key);
          setError("Sessão local inválida. Entre novamente.");
        }
      }
    } catch (cause) {
      console.error("Falha ao ler sessão:", cause);
      setError("Não foi possível recuperar a sessão local. Entre novamente.");
    }
    const socket: Socket<ServerEvents, ClientEvents> = io({ autoConnect: false });
    socketRef.current = socket;
    socket.on("availability", setAvailableId);
    socket.on("snapshot", (snapshot) => {
      setRoom(snapshot);
      if (!snapshot) {
        remember(null);
        setError("A partida foi encerrada no notebook.");
      }
    });
    socket.on("connect", () => {
      setConnected(true);
      if (!credentials.current) {
        setReady(true);
        return;
      }
      socket.timeout(8000).emit("command", { type: "restore", credentials: credentials.current }, (cause, reply) => {
        if (cause) {
          setError("Não foi possível recuperar a sessão. Reconecte para tentar novamente.");
          setReady(false);
          return;
        }
        if (reply.ok) {
          setRoom(reply.room);
          if (reply.credentials) remember(reply.credentials);
          setError("");
        } else {
          setError(reply.error);
          if (reply.code === "NO_ROOM" || reply.code === "INVALID_SESSION") {
            remember(null);
            setRoom(null);
          }
        }
        setReady(true);
      });
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setReady(false);
    });
    socket.on("connect_error", () => {
      setError("Sem conexão com o notebook. Verifique a rede e se o servidor está ligado.");
    });
    socket.on("replaced", () => {
      remember(null);
      setRoom(null);
      setError("Esta sessão foi aberta em outra conexão. Use a outra aba ou recarregue para entrar novamente.");
      socket.disconnect();
    });
    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role, key]);

  async function send(command: Command): Promise<boolean> {
    const socket = socketRef.current;
    if (!socket?.connected || !ready) {
      setError("Aguarde a conexão com o servidor.");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const reply = await new Promise<Reply>((resolve, reject) => {
        socket.timeout(8000).emit("command", command, (cause, result) => {
          if (cause) reject(cause);
          else resolve(result);
        });
      });
      if (!reply.ok) {
        setError(reply.error);
        return false;
      }
      if (reply.credentials) remember(reply.credentials);
      setRoom(reply.room);
      if (!reply.room) remember(null);
      return true;
    } catch (cause) {
      console.error("Falha de comunicação:", cause);
      setError("O servidor não confirmou a operação. Reconecte para conferir o estado antes de tentar novamente.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { room, connected, ready, busy, error, send, setError, availableId, playerId };
}

export type Session = ReturnType<typeof useSession>;
