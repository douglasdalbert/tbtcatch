import { randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  characterIds,
  commandSchema,
  type Command,
  type Credentials,
  type Player,
  type Reply,
  type RoomSnapshot,
} from "@catch/shared";

type Role = Credentials["role"];
interface Member {
  role: Role;
  token: string;
  socketId: string | null;
  player?: Player;
}
interface Room {
  snapshot: RoomSnapshot;
  members: Member[];
}

class CommandError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export class RoomService {
  private room: Room | null = null;

  constructor(
    private readonly publish: (socketIds: string[], snapshot: RoomSnapshot | null) => void,
    private readonly replace: (socketId: string) => void,
  ) {}

  execute(socketId: string, input: unknown): Reply {
    const parsed = commandSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "INVALID_COMMAND", error: "Comando inválido. Confira os dados enviados." };
    }
    try {
      const credentials = this.handle(socketId, parsed.data);
      this.broadcast();
      return { ok: true, room: this.snapshot(), ...(credentials ? { credentials } : {}) };
    } catch (error) {
      if (error instanceof CommandError) {
        return { ok: false, code: error.code, error: error.message };
      }
      throw error;
    }
  }

  disconnect(socketId: string): void {
    const member = this.room?.members.find((entry) => entry.socketId === socketId);
    if (!member) return;
    member.socketId = null;
    if (member.player) member.player.connected = false;
    if (member.role === "host") this.requireRoom().snapshot.hostConnected = false;
    if (member.role === "map") {
      const { snapshot } = this.requireRoom();
      snapshot.map.connected = false;
      snapshot.map.fullscreen = false;
      this.pause("O mapa desconectou. Reconecte e retome pelo notebook.");
    }
    this.broadcast();
  }

  snapshot(): RoomSnapshot | null {
    return this.room ? structuredClone(this.room.snapshot) : null;
  }

  private requireRoom(): Room {
    if (!this.room) throw new CommandError("NO_ROOM", "A partida ainda não foi preparada no notebook.");
    return this.room;
  }

  private member(socketId: string, role?: Role): Member {
    const member = this.requireRoom().members.find((entry) => entry.socketId === socketId);
    if (!member || (role && member.role !== role)) {
      throw new CommandError("FORBIDDEN", "Este dispositivo não pode realizar essa operação.");
    }
    return member;
  }

  private addMember(socketId: string, role: Role, name?: string): Credentials {
    const room = this.requireRoom();
    const token = randomBytes(24).toString("hex");
    const available = characterIds.filter((id) => !room.snapshot.players.some((player) => player.characterId === id));
    if (role === "player" && !available.length) {
      throw new CommandError("NO_CHARACTERS", "Todos os personagens estão ocupados. Não é possível adicionar outro jogador.");
    }
    const player: Player | undefined = role === "player"
      ? { id: randomUUID(), name: name!, characterId: available[randomInt(available.length)], connected: true }
      : undefined;
    room.members.push({ role, token, socketId, player });
    if (player) room.snapshot.players.push(player);
    return { role, roomId: room.snapshot.id, token, ...(player ? { playerId: player.id } : {}) };
  }

  private handle(socketId: string, command: Command): Credentials | undefined {
    if (command.type === "create") {
      if (this.room) throw new CommandError("ROOM_EXISTS", "Já existe uma partida preparada neste servidor.");
      this.room = {
        snapshot: {
          id: randomUUID(),
          status: "lobby",
          pauseReason: null,
          hostConnected: true,
          map: { connected: false, fullscreen: false, viewport: null },
          players: [],
        },
        members: [],
      };
      return this.addMember(socketId, "host");
    }
    if (command.type === "restore") {
      const room = this.requireRoom();
      const credentials = command.credentials;
      const member = room.members.find((entry) => entry.token === credentials.token
        && entry.role === credentials.role && room.snapshot.id === credentials.roomId);
      if (!member) throw new CommandError("INVALID_SESSION", "Esta sessão expirou. Conecte-se à partida novamente.");
      const existing = room.members.find((entry) => entry.socketId === socketId);
      if (existing && existing !== member) {
        throw new CommandError("ALREADY_JOINED", "Este dispositivo já está vinculado à partida.");
      }
      if (member.socketId && member.socketId !== socketId) this.replace(member.socketId);
      member.socketId = socketId;
      if (member.player) member.player.connected = true;
      if (member.role === "host") room.snapshot.hostConnected = true;
      if (member.role === "map") {
        room.snapshot.map.connected = true;
        room.snapshot.map.fullscreen = false;
        this.pause("Confirme o fullscreen do mapa e retome pelo notebook.");
      }
      return { role: member.role, roomId: room.snapshot.id, token: member.token,
        ...(member.player ? { playerId: member.player.id } : {}) };
    }
    if (command.type === "joinMap" || command.type === "joinPlayer") {
      const room = this.requireRoom();
      if (room.members.some((entry) => entry.socketId === socketId)) {
        throw new CommandError("ALREADY_JOINED", "Este dispositivo já entrou na partida.");
      }
      if (command.type === "joinMap") {
        if (room.members.some((entry) => entry.role === "map")) {
          throw new CommandError("MAP_EXISTS", "O mapa já foi vinculado. Reabra a sessão original do tablet.");
        }
        room.snapshot.map.connected = true;
        return this.addMember(socketId, "map");
      }
      if (room.snapshot.status !== "lobby") {
        throw new CommandError("ALREADY_STARTED", "A sessão já começou. Somente jogadores já inscritos podem reconectar.");
      }
      let suffix = room.snapshot.players.length;
      let name: string;
      do {
        let value = suffix++;
        let letters = "";
        do {
          letters = String.fromCharCode(65 + value % 26) + letters;
          value = Math.floor(value / 26) - 1;
        } while (value >= 0);
        name = `Jogador ${letters}`;
      } while (room.snapshot.players.some((player) => player.name.toLocaleLowerCase() === name.toLocaleLowerCase()));
      return this.addMember(socketId, "player", name);
    }
    const room = this.requireRoom();
    if (command.type === "renamePlayer" || command.type === "selectCharacter") {
      const player = this.member(socketId, "player").player!;
      if (command.type === "renamePlayer") {
        if (room.snapshot.players.some((other) => other.id !== player.id
          && other.name.toLocaleLowerCase() === command.name.toLocaleLowerCase())) {
          throw new CommandError("NAME_TAKEN", "Esse nome já está em uso. Escolha outro.");
        }
        player.name = command.name;
      } else {
        if (room.snapshot.players.some((other) => other.id !== player.id && other.characterId === command.characterId)) {
          throw new CommandError("CHARACTER_TAKEN", "Esse personagem já está em uso. Escolha outro.");
        }
        player.characterId = command.characterId;
      }
      return;
    }
    if (command.type === "mapState") {
      this.member(socketId, "map");
      room.snapshot.map = {
        connected: true,
        fullscreen: command.fullscreen,
        viewport: command.fullscreen ? { width: command.width, height: command.height } : null,
      };
      if (!command.fullscreen) this.pause("O mapa saiu do fullscreen. Ative novamente e retome pelo notebook.");
      return;
    }
    this.member(socketId, "host");
    if (command.type === "close") {
      const recipients = room.members.flatMap((entry) => entry.socketId ? [entry.socketId] : []);
      this.room = null;
      this.publish(recipients, null);
      return;
    }
    if (!room.snapshot.map.connected || !room.snapshot.map.fullscreen) {
      throw new CommandError("MAP_NOT_READY", "O tablet precisa estar conectado e em fullscreen.");
    }
    if (command.type === "start") {
      if (room.snapshot.status !== "lobby") throw new CommandError("ALREADY_STARTED", "A sessão já começou.");
      if (!room.snapshot.players.length || room.snapshot.players.some((player) => !player.connected)) {
        throw new CommandError("PLAYERS_NOT_READY", "Conecte pelo menos um jogador e reconecte os demais.");
      }
    } else if (room.snapshot.status !== "paused") {
      throw new CommandError("NOT_PAUSED", "A sessão não está pausada.");
    }
    room.snapshot.status = "running";
    room.snapshot.pauseReason = null;
  }

  private pause(reason: string): void {
    const room = this.requireRoom();
    if (room.snapshot.status === "lobby") return;
    room.snapshot.status = "paused";
    room.snapshot.pauseReason = reason;
  }

  private broadcast(): void {
    if (!this.room) return;
    this.publish(
      this.room.members.flatMap((entry) => entry.socketId ? [entry.socketId] : []),
      this.snapshot(),
    );
  }
}
