import { useEffect, useRef, useState, type ReactNode } from "react";
import { characters, type Player } from "@catch/shared";
import type { Session } from "./session";
import { Character } from "./Character";

function EditModal({ title, children, onClose }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog className="profile-modal" ref={dialog} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="modal-heading"><h2>{title}</h2><button className="secondary" onClick={onClose} aria-label="Fechar">×</button></div>
    {children}
  </dialog>;
}

function Profile({ session, player }: { session: Session; player: Player }) {
  const [editing, setEditing] = useState<"name" | "character" | null>(null);
  const [name, setName] = useState(player.name);
  const disabled = !session.ready || session.busy;
  return <>
    <header className="player-header">
      <button className="player-name" disabled={disabled} onClick={() => {
        setName(player.name);
        setEditing("name");
      }} aria-label={`Editar nome: ${player.name}`}>{player.name}<span>Toque para editar</span></button>
      <button className="character-circle" disabled={disabled} onClick={() => setEditing("character")} aria-label="Trocar personagem">
        <Character id={player.characterId} />
      </button>
    </header>
    {editing === "name" && <EditModal title="Editar nome" onClose={() => setEditing(null)}>
      <form onSubmit={(event) => {
        event.preventDefault();
        void session.send({ type: "renamePlayer", name }).then((ok) => { if (ok) setEditing(null); });
      }}>
        <label>Seu nome<input autoFocus required maxLength={24} value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" /></label>
        {session.error && <p role="alert" className="error">{session.error}</p>}
        <button disabled={disabled || !name.trim()}>Salvar nome</button>
      </form>
    </EditModal>}
    {editing === "character" && <EditModal title="Escolher personagem" onClose={() => setEditing(null)}>
      <p>Personagens usados por outros jogadores ficam indisponíveis.</p>
      <div className="character-options">
        {characters.map((character) => {
          const owner = session.room!.players.find((other) => other.id !== player.id && other.characterId === character.id);
          const selected = player.characterId === character.id;
          return <button key={character.id} disabled={disabled || Boolean(owner)} aria-pressed={selected}
            aria-label={`${character.name}${owner ? ` · em uso por ${owner.name}` : ""}`}
            onClick={() => void session.send({ type: "selectCharacter", characterId: character.id })
              .then((ok) => { if (ok) setEditing(null); })}>
            <Character id={character.id} /><span>{owner ? "Em uso" : selected ? "Atual" : character.name}</span>
          </button>;
        })}
      </div>
      {session.error && <p role="alert" className="error">{session.error}</p>}
    </EditModal>}
  </>;
}

export function PlayerScreen({ session }: { session: Session }) {
  const player = session.room?.players.find((entry) => entry.id === session.playerId);
  if (!player) return null;
  return <>
    <Profile session={session} player={player} />
    <div className={`status ${session.room!.status}`} role="status">
      {!session.connected ? "Reconectando…" : session.room!.status === "paused" ? "Jogo pausado" : session.room!.status === "lobby" ? "Aguardando início" : "Conectado"}
    </div>
    {session.room!.pauseReason && <p className="notice">{session.room!.pauseReason}</p>}
    <section className="player-waiting">
      <p>Seu personagem está pronto.</p>
      <p className="hint">O mapa e as ações do turno serão adicionados nas próximas etapas.</p>
    </section>
  </>;
}
