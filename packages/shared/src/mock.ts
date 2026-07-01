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
  game: null,
  seats: [
    { playerId: 'p1', name: 'Gosto', team: 'A', connection: 'online' },
    { playerId: 'p2', name: 'Rival 1', team: 'B', connection: 'online' },
    { playerId: 'p3', name: 'Ferreira', team: 'A', connection: 'online' },
    { playerId: 'p4', name: 'Rival 2', team: 'B', connection: 'bot' },
  ],
};

export const mockPlayerView: PlayerView = {
  boneyardCount: 0,
  myHand: [
    [6, 6],
    [3, 5],
    [0, 4],
    [2, 2],
    [1, 6],
  ],
  opponentHands: { p2: 7, p3: 6, p4: 7 },
  board: [
    { tile: [5, 5], isDouble: true, placedBy: 'p2' },
    { tile: [5, 3], isDouble: false, placedBy: 'p3' },
    { tile: [5, 1], isDouble: false, placedBy: 'p4' },
  ],
  openEnds: [1, 3],
  turn: 'p1',
  passesInARow: 0,
  isFirstTurn: false,
  scores: { A: 45, B: 30 },
};
