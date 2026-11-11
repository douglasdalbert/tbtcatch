import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { characterIds, type Credentials, type Reply, type RoomSnapshot } from "@catch/shared";
import { RoomService } from "./room";

function success(reply: Reply) {
  expect(reply.ok).toBe(true);
  if (!reply.ok) throw new Error(reply.error);
  return reply;
}

function credentials(reply: Reply): Credentials {
  const value = success(reply).credentials;
  if (!value) throw new Error("Credenciais ausentes");
  return value;
}

describe("sala em memória", () => {
  let rooms: RoomService;
  let publish: Mock<(ids: string[], snapshot: RoomSnapshot | null) => void>;
  let replace: Mock<(id: string) => void>;
  let host: Credentials;

  beforeEach(() => {
    publish = vi.fn();
    replace = vi.fn();
    rooms = new RoomService(publish, replace);
    host = credentials(rooms.execute("host", { type: "create" }));
  });

  function joinMap() {
    return credentials(rooms.execute("map", { type: "joinMap" }));
  }
  function fullscreen(value = true) {
    return rooms.execute("map", { type: "mapState", fullscreen: value, width: 1200, height: 800 });
  }
  function joinPlayer(name?: string, socket = "player") {
    const identity = credentials(rooms.execute(socket, { type: "joinPlayer" }));
    if (name) success(rooms.execute(socket, { type: "renamePlayer", name }));
    return identity;
  }
  function start() {
    joinMap();
    fullscreen();
    joinPlayer();
    success(rooms.execute("host", { type: "start" }));
  }

  it("cria apenas uma sala e não expõe credenciais no snapshot", () => {
    const original = rooms.snapshot()!;
    const other = credentials(rooms.execute("other", { type: "create" }));
    expect(other.roomId).toBe(original.id);
    expect(rooms.snapshot()!.id).toBe(original.id);
    expect(credentials(rooms.execute("other", { type: "create" }))).toEqual(other);
    rooms.disconnect("host");
    expect(rooms.snapshot()!.hostConnected).toBe(true);
    expect(JSON.stringify(rooms.snapshot())).not.toContain(host.token);
    expect(rooms.snapshot()!.id).toBe(host.roomId);
  });

  it("abrir o painel existente preserva jogadores e recusa trocar o papel do jogador", () => {
    joinPlayer();
    const before = rooms.snapshot();
    success(rooms.execute("another-host", { type: "create" }));
    expect(rooms.snapshot()).toEqual(before);
    expect(rooms.execute("player", { type: "create" })).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("valida entradas antes de alterar estado", () => {
    joinPlayer();
    const before = rooms.snapshot();
    expect(rooms.execute("player", { type: "renamePlayer", name: " " })).toMatchObject({ ok: false, code: "INVALID_COMMAND" });
    expect(rooms.execute("player", { type: "selectCharacter", characterId: "missing" })).toMatchObject({ ok: false, code: "INVALID_COMMAND" });
    expect(rooms.snapshot()).toEqual(before);
  });

  it("recusa nome duplicado, papel duplicado e segundo mapa", () => {
    joinPlayer("  Ana ");
    expect(rooms.snapshot()!.players[0].name).toBe("Ana");
    joinPlayer(undefined, "other");
    expect(rooms.execute("other", { type: "renamePlayer", name: "ana" })).toMatchObject({ ok: false, code: "NAME_TAKEN" });
    expect(rooms.execute("player", { type: "joinMap" })).toMatchObject({ ok: false, code: "ALREADY_JOINED" });
    joinMap();
    expect(rooms.execute("another-map", { type: "joinMap" })).toMatchObject({ ok: false, code: "MAP_EXISTS" });
  });

  it("exige mapa em fullscreen e jogadores conectados para iniciar", () => {
    expect(rooms.execute("host", { type: "start" })).toMatchObject({ ok: false, code: "MAP_NOT_READY" });
    joinMap();
    expect(rooms.execute("host", { type: "start" })).toMatchObject({ ok: false, code: "MAP_NOT_READY" });
    fullscreen();
    expect(rooms.execute("host", { type: "start" })).toMatchObject({ ok: false, code: "PLAYERS_NOT_READY" });
    joinPlayer();
    rooms.disconnect("player");
    expect(rooms.execute("host", { type: "start" })).toMatchObject({ ok: false, code: "PLAYERS_NOT_READY" });
  });

  it("sincroniza dois jogadores e recusa controle por papel incorreto", () => {
    joinPlayer("Ana", "a");
    joinPlayer("Bia", "b");
    expect(rooms.snapshot()!.players).toHaveLength(2);
    expect(rooms.execute("a", { type: "close" })).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(rooms.execute("host", { type: "mapState", fullscreen: true, width: 1, height: 1 })).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(publish).toHaveBeenLastCalledWith(["host", "a", "b"], rooms.snapshot());
  });

  it("pausa ao sair do fullscreen e só retoma por decisão do anfitrião", () => {
    start();
    expect(rooms.snapshot()!.status).toBe("running");
    success(fullscreen(false));
    expect(rooms.snapshot()).toMatchObject({ status: "paused", map: { viewport: null } });
    expect(rooms.execute("host", { type: "resume" })).toMatchObject({ ok: false, code: "MAP_NOT_READY" });
    fullscreen();
    expect(rooms.snapshot()!.status).toBe("paused");
    success(rooms.execute("host", { type: "resume" }));
    expect(rooms.snapshot()!.status).toBe("running");
  });

  it("pausa na desconexão do mapa e exige novo relatório de fullscreen na reconexão", () => {
    const map = joinMap();
    fullscreen();
    joinPlayer();
    success(rooms.execute("host", { type: "start" }));
    rooms.disconnect("map");
    expect(rooms.snapshot()).toMatchObject({ status: "paused", map: { connected: false, fullscreen: false } });
    success(rooms.execute("map2", { type: "restore", credentials: map }));
    expect(rooms.snapshot()!.map.fullscreen).toBe(false);
    expect(rooms.execute("host", { type: "resume" })).toMatchObject({ ok: false, code: "MAP_NOT_READY" });
  });

  it("restaura jogador sem duplicação e rejeita sessões forjadas ou expiradas", () => {
    const player = joinPlayer();
    const original = rooms.snapshot()!.players[0];
    rooms.disconnect("player");
    expect(rooms.snapshot()!.players[0].connected).toBe(false);
    success(rooms.execute("new", { type: "restore", credentials: player }));
    expect(rooms.snapshot()!.players).toEqual([original]);
    expect(player.playerId).toBe(original.id);
    expect(rooms.execute("bad", { type: "restore", credentials: { ...player, token: "fake" } })).toMatchObject({ ok: false, code: "INVALID_SESSION" });
    const freshServer = new RoomService(vi.fn(), vi.fn());
    expect(freshServer.execute("new", { type: "restore", credentials: player })).toMatchObject({ ok: false, code: "NO_ROOM" });
  });

  it("substitui conexão antiga sem permitir duplicação de identidade", () => {
    const player = joinPlayer();
    success(rooms.execute("new", { type: "restore", credentials: player }));
    expect(replace).toHaveBeenCalledWith("player");
    rooms.disconnect("player");
    expect(rooms.snapshot()!.players[0].connected).toBe(true);
    expect(rooms.execute("new", { type: "restore", credentials: host })).toMatchObject({ ok: false, code: "ALREADY_JOINED" });
  });

  it("bloqueia novos jogadores depois de iniciar mas aceita reconexão", () => {
    const player = joinPlayer();
    joinMap();
    fullscreen();
    success(rooms.execute("host", { type: "start" }));
    expect(rooms.execute("late", { type: "joinPlayer" })).toMatchObject({ ok: false, code: "ALREADY_STARTED" });
    rooms.disconnect("player");
    success(rooms.execute("new", { type: "restore", credentials: player }));
  });

  it("atribui nomes automáticos e personagens exclusivos, reservados mesmo offline", () => {
    joinPlayer();
    joinPlayer(undefined, "second");
    expect(rooms.snapshot()!.players.map((player) => player.name)).toEqual(["Jogador A", "Jogador B"]);
    const first = rooms.snapshot()!.players[0];
    const second = rooms.snapshot()!.players[1];
    expect(first.characterId).not.toBe(second.characterId);
    rooms.disconnect("player");
    expect(rooms.execute("second", { type: "selectCharacter", characterId: first.characterId })).toMatchObject({ ok: false, code: "CHARACTER_TAKEN" });
  });

  it("sincroniza edição de nome e personagem e libera o personagem anterior", () => {
    joinPlayer();
    joinPlayer(undefined, "second");
    const previous = rooms.snapshot()!.players[0].characterId;
    const available = characterIds.find((id) => !rooms.snapshot()!.players.some((player) => player.characterId === id))!;
    success(rooms.execute("player", { type: "renamePlayer", name: "  Ana  " }));
    success(rooms.execute("player", { type: "selectCharacter", characterId: available }));
    success(rooms.execute("second", { type: "selectCharacter", characterId: previous }));
    expect(rooms.snapshot()!.players[0]).toMatchObject({ name: "Ana", characterId: available });
    expect(rooms.execute("host", { type: "renamePlayer", name: "Admin" })).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(rooms.execute("unknown", { type: "selectCharacter", characterId: previous })).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("recusa disputa pelo mesmo personagem e entrada quando todos estão ocupados", () => {
    for (let index = 0; index < characterIds.length; index++) joinPlayer(undefined, `p${index}`);
    expect(new Set(rooms.snapshot()!.players.map((player) => player.characterId)).size).toBe(characterIds.length);
    expect(rooms.execute("extra", { type: "joinPlayer" })).toMatchObject({ ok: false, code: "NO_CHARACTERS" });
    const before = rooms.snapshot();
    expect(rooms.execute("p1", { type: "selectCharacter", characterId: before!.players[0].characterId })).toMatchObject({ ok: false, code: "CHARACTER_TAKEN" });
    expect(rooms.snapshot()).toEqual(before);
  });

  it("evita colisões dos nomes automáticos com nomes editados", () => {
    joinPlayer("Jogador B");
    joinPlayer(undefined, "second");
    expect(rooms.snapshot()!.players.map((player) => player.name)).toEqual(["Jogador B", "Jogador C"]);
  });

  it("encerra para todos e permite criar nova sala sem recuperar o jogo anterior", () => {
    joinMap();
    joinPlayer();
    const oldRoom = rooms.snapshot()!;
    success(rooms.execute("host", { type: "close" }));
    expect(rooms.snapshot()).toBeNull();
    expect(publish).toHaveBeenLastCalledWith(["host", "map", "player"], null);
    const fresh = success(rooms.execute("new-host", { type: "create" })).room!;
    expect(fresh.id).not.toBe(oldRoom.id);
    expect(fresh.players).toEqual([]);
    expect(rooms.execute("old-host", { type: "restore", credentials: host })).toMatchObject({ ok: false, code: "INVALID_SESSION" });
  });
});
