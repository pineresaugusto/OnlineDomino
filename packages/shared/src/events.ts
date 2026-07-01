import { Room, PlayerView, Seat, Mode, Ruleset, Tile } from './types';

// Events from Client to Server
export interface ClientToServerEvents {
  createRoom: (payload: { name: string; ruleset: Ruleset; mode: Mode; targetScore: number }) => void;
  joinRoom: (payload: { code: string; name: string }) => void;
  addBot: () => void;
  startGame: () => void;
  playTile: (payload: { tile: Tile; end: 'left' | 'right' }) => void;
  pass: () => void;
  drawTile: () => void;
  sendEmote: (emoteId: string) => void;
  sendChat: (message: string) => void;
  requestRematch: () => void;
  leaveRoom: () => void;
}

// Events from Server to Client
export interface ServerToClientEvents {
  identity: (payload: { playerId: string; code: string }) => void; // le dice al cliente quién es y en qué sala
  roomUpdate: (room: Omit<Room, 'game'>) => void; // Send room without the full GameState
  gameUpdate: (view: PlayerView) => void;
  yourTurn: () => void;
  turnTimer: (secondsLeft: number) => void;
  handResult: (payload: { winnerTeam: 'A' | 'B' | string | null; points: number; isBlocked: boolean; fullHands: Record<string, Tile[]> }) => void;
  matchResult: (payload: { winnerTeam: 'A' | 'B' | string; finalScores: any }) => void;
  emote: (payload: { playerId: string; emoteId: string }) => void;
  chat: (payload: { playerId: string; message: string }) => void;
  playerConnection: (payload: { playerId: string; status: Seat['connection'] }) => void;
  error: (message: string) => void;
}
