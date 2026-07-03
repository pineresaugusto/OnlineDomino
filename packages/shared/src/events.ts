import { Room, PlayerView, Seat, Mode, Ruleset, Tile, ScoreKey } from './types';

// Events from Client to Server
export interface ClientToServerEvents {
  createRoom: (payload: { name: string; ruleset: Ruleset; mode: Mode; targetScore: number }) => void;
  joinRoom: (payload: { code: string; name: string }) => void;
  rejoinRoom: (payload: { code: string; playerId: string }) => void;
  addBot: () => void;
  startGame: () => void;
  playTile: (payload: { tile: Tile; end: 'left' | 'right' }) => void;
  pass: () => void;
  drawTile: () => void;
  sendEmote: (emoteId: string) => void;
  sendChat: (message: string) => void;
  requestRematch: () => void; // siguiente mano (handOver) o nueva partida (matchOver)
  leaveRoom: () => void;
}

// Events from Server to Client
export interface ServerToClientEvents {
  identity: (payload: { playerId: string; code: string }) => void; // le dice al cliente quién es y en qué sala
  rejoinFailed: () => void; // la sesión guardada ya no es válida
  roomUpdate: (room: Omit<Room, 'game'>) => void; // Send room without the full GameState
  gameUpdate: (view: PlayerView) => void;
  yourTurn: () => void;
  turnTimer: (secondsLeft: number) => void;
  handResult: (payload: {
    winnerKey: ScoreKey | null;
    winnerName: string | null;
    points: number;
    isBlocked: boolean;
    fullHands: Record<string, Tile[]>;
    scores: Record<ScoreKey, number>;
  }) => void;
  matchResult: (payload: {
    winnerKey: ScoreKey;
    winnerName: string | null;
    finalScores: Record<ScoreKey, number>;
  }) => void;
  emote: (payload: { playerId: string; emoteId: string }) => void;
  chat: (payload: { playerId: string; message: string }) => void;
  playerConnection: (payload: { playerId: string; status: Seat['connection'] }) => void;
  error: (message: string) => void;
}
