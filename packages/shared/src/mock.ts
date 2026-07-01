// ── Fixtures de ejemplo para desarrollar el frontend sin el servidor real.
//    Gosto (Track A) puede renderizar la mesa contra estos datos.
import type { PlayerView, Room } from './types';

export const mockRoom: Room = {
  code: 'ABCD',
  ruleset: 'cuban',
  mode: 'team2v2',
  targetScore: 100,
  status: 'playing',
  hostId: 'p1',
  seats: [
    { index: 0, playerId: 'p1', name: 'Gosto', team: 'A', connection: 'online' },
    { index: 1, playerId: 'p2', name: 'Rival 1', team: 'B', connection: 'online' },
    { index: 2, playerId: 'p3', name: 'Ferreira', team: 'A', connection: 'online' },
    { index: 3, playerId: 'p4', name: 'Rival 2', team: 'B', connection: 'bot' },
  ],
};

export const mockPlayerView: PlayerView = {
  you: 'p1',
  yourHand: [
    { a: 6, b: 6 },
    { a: 3, b: 5 },
    { a: 0, b: 4 },
    { a: 2, b: 2 },
    { a: 1, b: 6 },
  ],
  opponentHandCounts: { p2: 7, p3: 6, p4: 7 },
  board: [
    { tile: { a: 5, b: 5 }, end: 'root' },
    { tile: { a: 5, b: 3 }, end: 'right' },
    { tile: { a: 5, b: 1 }, end: 'left' },
  ],
  openEnds: { left: 1, right: 3 },
  turn: 'p1',
  scores: { A: 45, B: 30 },
};
