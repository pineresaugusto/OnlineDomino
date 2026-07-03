export type Tile = [number, number]; // [0..6, 0..6]

export type PlacedTile = {
  tile: Tile; // orientado para lectura izquierda→derecha en la mesa
  isDouble: boolean;
  placedBy: string; // playerId
};

export type Ruleset = 'cuban' | 'block' | 'draw';
export type Mode = 'team2v2' | 'ffa' | '1v1';
export type RoomStatus = 'lobby' | 'playing' | 'handOver' | 'matchOver';
export type ConnectionStatus = 'online' | 'reconnecting' | 'bot';

// Clave de puntuación: 'A' | 'B' en equipos y 1v1; playerId en FFA.
export type ScoreKey = string;

export interface Seat {
  playerId: string | null;
  name: string;
  team: 'A' | 'B' | null;
  connection: ConnectionStatus;
}

export interface Room {
  code: string;
  ruleset: Ruleset;
  mode: Mode;
  targetScore: number;
  status: RoomStatus;
  seats: Seat[];
  game: GameState | null;
  hostId: string;
  scores: Record<ScoreKey, number>;
}

export interface GameState {
  boneyard: Tile[];
  board: PlacedTile[];
  hands: Record<string, Tile[]>; // playerId -> Tile[]
  turn: string; // playerId
  passesInARow: number;
  openEnds: [number, number] | null; // los dos números jugables
  isFirstTurn: boolean;
  requiredOpener: Tile | null; // salida forzada (doble más alto) en la primera mano
}

// Lo que el servidor envía a cada jugador
export interface PlayerView {
  boneyardCount: number;
  board: PlacedTile[];
  myHand: Tile[];
  // Cuántas fichas tiene cada rival
  opponentHands: Record<string, number>;
  turn: string; // playerId
  passesInARow: number;
  scores: Record<ScoreKey, number>;
  openEnds: [number, number] | null;
  isFirstTurn: boolean;
  requiredOpener: Tile | null;
}
