export type Tile = [number, number]; // [0..6, 0..6]

export type PlacedTile = {
  tile: Tile;
  isDouble: boolean;
  placedBy: string; // playerId
  // Minimal representation for rendering and game logic
  // For the board, we really just need to know the open ends, 
  // but keeping track of placed tiles helps with UI.
};

export type Ruleset = 'cuban' | 'block' | 'draw';
export type Mode = 'team2v2' | 'ffa' | '1v1';
export type RoomStatus = 'lobby' | 'playing' | 'handOver' | 'matchOver';
export type ConnectionStatus = 'online' | 'reconnecting' | 'bot';

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
}

export interface GameState {
  boneyard: Tile[];
  board: PlacedTile[];
  hands: Record<string, Tile[]>; // playerId -> Tile[]
  turn: string; // playerId
  passesInARow: number;
  scores: { A: number; B: number } | Record<string, number>;
  openEnds: [number, number] | null; // The two numbers available to play on
  isFirstTurn: boolean;
}

// What the server sends to each specific player
export interface PlayerView {
  boneyardCount: number;
  board: PlacedTile[];
  myHand: Tile[];
  // How many tiles everyone else has
  opponentHands: Record<string, number>; 
  turn: string; // playerId
  passesInARow: number;
  scores: { A: number; B: number } | Record<string, number>;
  openEnds: [number, number] | null;
  isFirstTurn: boolean;
}
