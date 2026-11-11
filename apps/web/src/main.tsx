import { useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import { z } from "zod";
import type { RoomSnapshot } from "@catch/shared";
import { useSession, type Session } from "./session";
import { Character } from "./Character";
import { PlayerScreen } from "./PlayerScreen";
import "./style.css";

const labels = { lobby: "Aguardando início", running: "Sessão conectada", paused: "Sessão pausada" };

function Confirm({ children, onConfirm, onCancel }: {
  children: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <h2>Confirmar</h2>
    <p>{children}</p>
    <div className="actions">
      <button autoFocus className="secondary" onClick={onCancel}>Cancelar</button>
      <button onClick={onConfirm}>Confirmar</button>
    </div>
  </dialog>;
}

function ConnectionDot({ label, state }: { label: string; state: "connected" | "disconnected" | "pending" }) {
  const description = { connected: "conectado", disconnected: "desconectado", pending: "aguardando" }[state];
  return <span className={`connection-dot ${state}`} role="img"
    aria-label={`${label}: ${description}`} title={`${label}: ${description}`} />;
}

function RoomStatus({ room }: { room: RoomSnapshot }) {
  return <>
    <div className={`status ${room.status}`} role="status">{labels[room.status]}</div>
    {room.pauseReason && <p className="notice">{room.pauseReason}</p>}
  </>;
}

function Players({ room }: { room: RoomSnapshot }) {
  return <section className="panel">
    <h2>Jogadores <span className="count">{room.players.length}</span></h2>
    {!room.players.length && <p>Ninguém entrou ainda. Compartilhe o QR code para começar.</p>}
    <ul className="players">{room.players.map((player) =>
      <li key={player.id}>
        <span className="avatar"><Character id={player.characterId} /></span>
        <strong>{player.name}</strong>
        <span className={player.connected ? "online" : "offline"}>{player.connected ? "Conectado" : "Reconectando"}</span>
      </li>)}</ul>
  </section>;
}

function Invite({ title, url }: { title: string; url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (canvas.current) {
      QRCode.toCanvas(canvas.current, url, { width: 200, margin: 2 }).then(() => {
        if (active) setError("");
      }).catch((cause: unknown) => {
        console.error("Erro ao gerar QR code:", cause);
        if (active) setError("Não foi possível gerar o QR code. Use o endereço abaixo.");
      });
    }
    return () => { active = false; };
  }, [url]);
  return <section className="panel invite">
    <h2>{title}</h2>
    <canvas ref={canvas} aria-label={`QR code: ${title}`} role="img" />
    {error && <p role="alert">{error}</p>}
    <a href={url}>{url}</a>
  </section>;
}

function Host({ session }: { session: Session }) {
  const { room, send, ready, busy, setError } = session;
  const [networkHost, setNetworkHost] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [opening, setOpening] = useState(false);
  const openRef = useRef(send);
  openRef.current = send;
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/network", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Nenhum IP de rede disponível.");
      const { address } = z.object({ address: z.ipv4() }).parse(await response.json());
      if (address.startsWith("127.") || address === "0.0.0.0") throw new Error("IP de rede inválido.");
      setNetworkHost(address);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      console.error("Falha ao detectar IP de rede:", cause);
      setError("Não foi possível detectar o IP de rede. Conecte o notebook ao Wi-Fi e recarregue o painel.");
    });
    return () => controller.abort();
  }, [setError]);
  useEffect(() => {
    if (ready && !room && !opening) {
      setOpening(true);
      void openRef.current({ type: "create" });
    }
  }, [ready, room, opening]);
  if (!room) return <section className="panel">
    <h2>Abrindo a aventura</h2>
    <p>A partida abre automaticamente. Conecte o tablet e os celulares na mesma rede Wi-Fi.</p>
    {opening && !busy && <button disabled={!ready} onClick={() => void send({ type: "create" })}>Abrir partida novamente</button>}
  </section>;
  const base = new URL(window.location.origin);
  if (networkHost) base.hostname = networkHost;
  const mapUrl = new URL("/map", base).href;
  const playerUrl = new URL("/player", base).href;
  const mapReady = room.map.connected && room.map.fullscreen;
  return <>
    <RoomStatus room={room} />
    {networkHost ? <div className="grid">
      <Invite title="Abrir mapa" url={mapUrl} />
      <Invite title="Jogar" url={playerUrl} />
    </div> : <p role="status">Detectando o IP de rede para os QR codes…</p>}
    <Players room={room} />
    <section className="panel">
      <h2>Teste de conexão</h2>
      <div className="actions">
        {room.status === "lobby" && <button disabled={!ready || busy || !mapReady || !room.players.length || room.players.some((player) => !player.connected)}
          onClick={() => void send({ type: "start" })}>Iniciar teste de conexão</button>}
        {room.status === "paused" && <button disabled={!ready || busy || !mapReady}
          onClick={() => void send({ type: "resume" })}>Retomar sessão</button>}
        <button className="secondary" disabled={!ready || busy} onClick={() => setConfirmClose(true)}>Encerrar partida</button>
      </div>
    </section>
    {confirmClose && <Confirm onCancel={() => setConfirmClose(false)} onConfirm={() => {
      setConfirmClose(false);
      void send({ type: "close" });
    }}>Encerrar a partida para todos? Os dados desta sessão serão descartados.</Confirm>}
  </>;
}

function Join({ session, map }: { session: Session; map: boolean }) {
  const [attemptedId, setAttemptedId] = useState<string | null>(null);
  const sendRef = useRef(session.send);
  sendRef.current = session.send;
  useEffect(() => {
    if (session.availableId && session.ready && attemptedId !== session.availableId) {
      setAttemptedId(session.availableId);
      void sendRef.current({ type: map ? "joinMap" : "joinPlayer" });
    }
  }, [map, session.availableId, session.ready, attemptedId]);
  return <section className="panel">
    <h2>{session.availableId ? map ? "Conectando o tablet" : "Preparando seu jogador" : "Aguardando o notebook"}</h2>
    <p>{session.availableId ? "A conexão é automática, sem salas ou códigos." : "Prepare a partida no painel do notebook. Esta tela conectará automaticamente."}</p>
    {attemptedId && session.availableId && !session.busy && <button disabled={!session.ready}
      onClick={() => void session.send({ type: map ? "joinMap" : "joinPlayer" })}>Tentar conectar novamente</button>}
  </section>;
}

function MapScreen({ session }: { session: Session }) {
  const { room, send, ready, setError } = session;
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (!room || !ready) return;
    const report = () => {
      void sendRef.current({
        type: "mapState",
        fullscreen: Boolean(document.fullscreenElement),
        width: Math.max(1, Math.round(window.innerWidth)),
        height: Math.max(1, Math.round(window.innerHeight)),
      });
    };
    report();
    document.addEventListener("fullscreenchange", report);
    window.addEventListener("resize", report);
    return () => {
      document.removeEventListener("fullscreenchange", report);
      window.removeEventListener("resize", report);
    };
  }, [room?.id, ready]);
  if (!room) return <Join session={session} map />;
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (cause) {
      console.error("Fullscreen indisponível:", cause);
      setError("Não foi possível ativar o fullscreen. Use um navegador compatível no tablet e tente novamente.");
    }
  };
  return <>
    <RoomStatus room={room} />
    <section className="map-placeholder panel">
      <span className="hex" aria-hidden="true">⬡</span>
      <h2>O tabuleiro começa aqui</h2>
      <p>Conexão pronta para receber o futuro mapa hexagonal.</p>
      {!room.map.fullscreen && (document.fullscreenEnabled
        ? <button disabled={!ready || session.busy} onClick={() => void enterFullscreen()}>Ativar fullscreen</button>
        : <p role="alert">Este navegador não oferece fullscreen. Abra o mapa em um navegador compatível para continuar.</p>)}
      {room.map.fullscreen && <p>Fullscreen ativo. O notebook pode iniciar ou retomar o teste.</p>}
    </section>
    <Players room={room} />
  </>;
}

function ConnectedApp({ role }: { role: "host" | "map" | "player" }) {
  const session = useSession(role);
  const title = role === "host" ? "Uma aventura na mesma mesa." : role === "map" ? "Mapa compartilhado" : "Seu jogador";
  return <main className={role === "player" ? "mobile-player" : undefined}>
    {role !== "player" && <header><a className="brand" href="/">CATCH <span>em família</span></a>
      <h1 className="connected-title"><span>{title}</span><ConnectionDot label="Notebook"
        state={!session.connected ? "disconnected" : session.ready ? "connected" : "pending"} /></h1>
    </header>}
    {session.error && <p className="error" role="alert">{session.error}</p>}
    {role === "host" ? <Host session={session} /> : role === "map" ? <MapScreen session={session} />
      : session.room ? <PlayerScreen session={session} /> : <Join session={session} map={false} />}
  </main>;
}

const role = location.pathname === "/map" ? "map" : location.pathname === "/player" ? "player" : "host";
createRoot(document.getElementById("root")!).render(<ConnectedApp role={role} />);
