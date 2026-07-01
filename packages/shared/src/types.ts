// ── Tipos base del dominio (compartidos cliente ↔ servidor) ──

export type Ruleset = 'cuban' | 'block' | 'draw';
export type Mode = 'team2v2' | 'ffa' | '1v1';
export type Team = 'A' | 'B';
export type ConnectionStatus = 'online' | 'reconnecting' | 'bot';
export type RoomStatus = 'lobby' | 'playing' | 'handOver' | 'matchOver';

/** Una ficha: par de valores 0..6. Ej: { a: 3, b: 5 }. */
export interface Tile {
  a: number;
  b: number;
}

export type BoardEnd = 'left' | 'right';

/** Ficha ya colocada en la mesa, indicando por qué extremo se pegó. */
export interface PlacedTile {
  tile: Tile;
  end: BoardEnd | 'root';
}

export interface Seat {
  index: number;
  playerId: string | null;
  name: string;
  team: Team | null; // null en modos ffa / 1v1
  connection: ConnectionStatus;
}

export interface ScoreByTeam {
  A: number;
  B: number;
}

/** Marcador: por equipo (2v2) o por jugador (ffa / 1v1). */
export type Scores = ScoreByTeam | Record<string, number>;

/** Estado COMPLETO de la partida — vive solo en el servidor (autoritativo). */
export interface GameState {
  boneyard: Tile[]; // pozo (modo draw)
  board: PlacedTile[];
  hands: Record<string, Tile[]>; // manos privadas por playerId
  turn: string; // playerId al que le toca
  passesInARow: number; // para detectar tranca
  scores: Scores;
}

/** Vista filtrada que recibe cada cliente: nunca ve las manos ajenas. */
export interface PlayerView {
  you: string; // tu playerId
  yourHand: Tile[];
  opponentHandCounts: Record<string, number>; // cuántas fichas tiene cada rival
  board: PlacedTile[];
  openEnds: { left: number; right: number } | null; // valores abiertos de la mesa
  turn: string;
  scores: Scores;
}

export interface Room {
  code: string; // "ABCD"
  ruleset: Ruleset;
  mode: Mode;
  targetScore: number; // 50 | 100 | 200 (cubano)
  status: RoomStatus;
  seats: Seat[];
  hostId: string;
}
