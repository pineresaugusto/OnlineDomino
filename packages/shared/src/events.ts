// ── Contrato de eventos Socket.IO (tipado, compartido cliente ↔ servidor) ──
import type { Room, PlayerView, Ruleset, Mode, Tile, BoardEnd, Scores } from './types';

export interface CreateRoomPayload {
  name: string;
  ruleset: Ruleset;
  mode: Mode;
  targetScore: number;
}

export interface JoinRoomPayload {
  code: string;
  name: string;
  playerId?: string; // presente al reconectar
}

export interface PlayTilePayload {
  tile: Tile;
  end: BoardEnd;
}

/** Eventos que el CLIENTE emite al SERVIDOR. */
export interface ClientToServerEvents {
  createRoom: (p: CreateRoomPayload, cb: (res: { code: string; playerId: string }) => void) => void;
  joinRoom: (p: JoinRoomPayload, cb: (res: { ok: boolean; playerId?: string; error?: string }) => void) => void;
  addBot: (p: { seatIndex: number }) => void;
  startGame: () => void;
  playTile: (p: PlayTilePayload) => void;
  pass: () => void;
  drawTile: () => void;
  sendEmote: (p: { emote: string }) => void;
  sendChat: (p: { text: string }) => void;
  requestRematch: () => void;
  leaveRoom: () => void;

  // ── Backlog (reservados; NO se implementan en v1) ──
  // joinQueue: (p: { ruleset: Ruleset; mode: Mode; name: string }) => void;
  // leaveQueue: () => void;
}

/** Eventos que el SERVIDOR emite al CLIENTE. */
export interface ServerToClientEvents {
  roomUpdate: (room: Room) => void;
  gameUpdate: (view: PlayerView) => void;
  yourTurn: () => void;
  turnTimer: (p: { secondsLeft: number }) => void;
  handResult: (p: { scores: Scores; winner: string | null }) => void;
  matchResult: (p: { winner: string }) => void;
  emote: (p: { from: string; emote: string }) => void;
  chat: (p: { from: string; text: string }) => void;
  playerConnection: (p: { playerId: string; status: string }) => void;
  errorMsg: (p: { message: string }) => void;
}
