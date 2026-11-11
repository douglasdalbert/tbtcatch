import { z } from "zod";
import { characterIds, type CharacterId } from "./characters";
export { characterIds, characters, type CharacterId } from "./characters";
export {
  attackMultiplier,
  elementNames,
  elementTypes,
  formatBonus,
  strongAgainst,
  typeBonus,
  type ElementType,
} from "./elements";

export const credentialsSchema = z.object({
  role: z.enum(["host", "map", "player"]),
  roomId: z.string().min(1),
  token: z.string().min(1),
  playerId: z.uuid().optional(),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create") }),
  z.object({ type: z.literal("restore"), credentials: credentialsSchema }),
  z.object({ type: z.literal("joinMap") }),
  z.object({ type: z.literal("joinPlayer") }),
  z.object({
    type: z.literal("renamePlayer"),
    name: z.string().trim().min(1).max(24),
  }),
  z.object({ type: z.literal("selectCharacter"), characterId: z.enum(characterIds) }),
  z.object({
    type: z.literal("mapState"),
    fullscreen: z.boolean(),
    width: z.number().int().positive().max(32768),
    height: z.number().int().positive().max(32768),
  }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("resume") }),
  z.object({ type: z.literal("close") }),
]);
export type Command = z.infer<typeof commandSchema>;

export interface Player {
  id: string;
  name: string;
  characterId: CharacterId;
  connected: boolean;
}

export interface RoomSnapshot {
  id: string;
  status: "lobby" | "running" | "paused";
  pauseReason: string | null;
  hostConnected: boolean;
  map: {
    connected: boolean;
    fullscreen: boolean;
    viewport: { width: number; height: number } | null;
  };
  players: Player[];
}

export type Reply =
  | { ok: true; room: RoomSnapshot | null; credentials?: Credentials }
  | { ok: false; code: string; error: string };

export interface ServerEvents {
  availability: (sessionId: string | null) => void;
  snapshot: (room: RoomSnapshot | null) => void;
  replaced: () => void;
}

export interface ClientEvents {
  command: (command: Command, acknowledge: (reply: Reply) => void) => void;
}
