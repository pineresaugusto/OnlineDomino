import { describe, it, expect } from 'vitest';
import { dealTiles, legalMoves, isBlocked, whoStarts, applyMove, createBoneyard, scoreHand, mustDraw } from '../src/rules';
import { GameState, Tile } from '../src/types';

const baseState = (over: Partial<GameState>): GameState => ({
  boneyard: [],
  board: [],
  hands: {},
  turn: 'p1',
  passesInARow: 0,
  openEnds: null,
  isFirstTurn: true,
  requiredOpener: null,
  ...over,
});

describe('Dominó Rules', () => {
  it('should create a boneyard of 28 tiles', () => {
    const boneyard = createBoneyard();
    expect(boneyard.length).toBe(28);
  });

  it('should deal 7 tiles to each player', () => {
    const { hands, boneyard } = dealTiles(['p1', 'p2', 'p3', 'p4'], 'cuban');
    expect(hands['p1'].length).toBe(7);
    expect(hands['p2'].length).toBe(7);
    expect(hands['p3'].length).toBe(7);
    expect(hands['p4'].length).toBe(7);
    expect(boneyard.length).toBe(0); // 28 - (7 * 4)
  });

  it('should determine who starts based on highest double, with forced opener', () => {
    const hands = {
      p1: [[0, 0], [1, 2]] as Tile[],
      p2: [[3, 3], [4, 5]] as Tile[],
      p3: [[6, 6], [1, 1]] as Tile[], // p3 has 6-6
      p4: [[2, 2], [4, 4]] as Tile[]
    };
    const { starter, opener } = whoStarts(hands);
    expect(starter).toBe('p3');
    expect(opener).toEqual([6, 6]);
  });

  it('should fall back to highest tile when nobody has doubles', () => {
    const hands = {
      p1: [[0, 1], [1, 2]] as Tile[],
      p2: [[5, 6], [4, 5]] as Tile[],
    };
    const { starter, opener } = whoStarts(hands);
    expect(starter).toBe('p2');
    expect(opener).toBeNull();
  });

  it('should allow any move on first turn without forced opener', () => {
    const moves = legalMoves({ myHand: [[6, 6], [3, 4]], openEnds: null, requiredOpener: null });
    expect(moves.length).toBe(2);
    expect(moves[0].end).toBe('any');
  });

  it('should force the opener tile on the first move when required', () => {
    const moves = legalMoves({ myHand: [[6, 6], [3, 4]], openEnds: null, requiredOpener: [6, 6] });
    expect(moves.length).toBe(1);
    expect(moves[0].tile).toEqual([6, 6]);
  });

  it('should only allow moves matching open ends', () => {
    const moves = legalMoves({ myHand: [[6, 6], [3, 4], [1, 6]], openEnds: [6, 2], requiredOpener: null });
    expect(moves.length).toBe(2); // [6,6] and [1,6]
    expect(moves.some(m => m.tile[0] === 3 && m.tile[1] === 4)).toBe(false);
  });

  it('should require drawing in draw mode when stuck and boneyard has tiles', () => {
    const view = { myHand: [[3, 4]] as Tile[], openEnds: [6, 2] as [number, number], requiredOpener: null, boneyardCount: 5 };
    expect(mustDraw(view, 'draw')).toBe(true);
    expect(mustDraw(view, 'block')).toBe(false);
    expect(mustDraw({ ...view, boneyardCount: 0 }, 'draw')).toBe(false);
    expect(mustDraw({ ...view, myHand: [[2, 4]] }, 'draw')).toBe(false); // tiene jugada
  });

  it('should detect a blocked game', () => {
    const state = baseState({
      hands: { p1: [], p2: [], p3: [], p4: [] },
      passesInARow: 4,
      openEnds: [1, 2],
      isFirstTurn: false,
    });
    expect(isBlocked(state)).toBe(true);

    state.passesInARow = 3;
    expect(isBlocked(state)).toBe(false);
  });

  it('should orient tiles left→right on the board', () => {
    let state = baseState({ hands: { p1: [[5, 6]], p2: [[3, 5], [4, 6]] } });
    state = applyMove(state, { tile: [5, 6], end: 'any' }, 'p1'); // board: 5|6
    expect(state.openEnds).toEqual([5, 6]);

    // [3,5] al extremo izquierdo (5) → debe mostrarse como 3|5
    state = applyMove(state, { tile: [3, 5], end: 'left' }, 'p2');
    expect(state.board[0].tile).toEqual([3, 5]);
    expect(state.openEnds).toEqual([3, 6]);

    // [4,6] al extremo derecho (6) → debe mostrarse como 6|4
    state = applyMove(state, { tile: [4, 6], end: 'right' }, 'p2');
    expect(state.board[state.board.length - 1].tile).toEqual([6, 4]);
    expect(state.openEnds).toEqual([3, 4]);

    // La cadena se lee de corrido: cada unión coincide
    for (let i = 0; i < state.board.length - 1; i++) {
      expect(state.board[i].tile[1]).toBe(state.board[i + 1].tile[0]);
    }
  });

  it('should remove the played tile regardless of stored orientation', () => {
    let state = baseState({ hands: { p1: [[5, 6]], p2: [[5, 3]] }, openEnds: null });
    state = applyMove(state, { tile: [5, 6], end: 'any' }, 'p1');
    state = applyMove(state, { tile: [3, 5], end: 'left' }, 'p2'); // guardada como [5,3]
    expect(state.hands['p2'].length).toBe(0);
  });

  it('should score a hand correctly when someone wins', () => {
    const state = baseState({
      hands: {
        p1: [], // Winner
        p2: [[1, 2], [3, 4]], // Opponent B (3 + 7 = 10)
        p3: [[0, 0]], // Partner A (0)
        p4: [[6, 6], [5, 5]] // Opponent B (12 + 10 = 22)
      },
      isFirstTurn: false,
    });

    const keyMap = { p1: 'A', p2: 'B', p3: 'A', p4: 'B' };
    const result = scoreHand(state, 'cuban', 'p1', keyMap);

    expect(result.winnerKey).toBe('A');
    expect(result.winnerId).toBe('p1');
    expect(result.points).toBe(32); // 10 + 22 from opponents
    expect(result.isBlocked).toBe(false);
  });

  it('should score a blocked game correctly', () => {
    const state = baseState({
      hands: {
        p1: [[1, 1]], // A (2)
        p2: [[2, 2]], // B (4)
        p3: [[0, 0]], // A (0)
        p4: [[3, 3]]  // B (6)
      },
      passesInARow: 4,
      openEnds: [6, 5],
      isFirstTurn: false,
    });

    const keyMap = { p1: 'A', p2: 'B', p3: 'A', p4: 'B' };
    const result = scoreHand(state, 'cuban', null, keyMap);

    // Team A has 2 points. Team B has 10 points.
    expect(result.winnerKey).toBe('A');
    expect(result.winnerId).toBe('p3'); // el de menos puntos del equipo ganador
    expect(result.points).toBe(10);
    expect(result.isBlocked).toBe(true);
  });

  it('should score a blocked 1v1 tie as no winner', () => {
    const state = baseState({
      hands: { p1: [[1, 2]], p2: [[3, 0]] }, // 3 vs 3
      passesInARow: 2,
      openEnds: [6, 5],
      isFirstTurn: false,
    });
    const result = scoreHand(state, 'block', null, { p1: 'A', p2: 'B' });
    expect(result.winnerKey).toBeNull();
    expect(result.points).toBe(0);
    expect(result.isBlocked).toBe(true);
  });

  it('should score FFA per player', () => {
    const state = baseState({
      hands: { p1: [], p2: [[1, 2]], p3: [[6, 6]] },
      isFirstTurn: false,
    });
    const result = scoreHand(state, 'block', 'p1', { p1: 'p1', p2: 'p2', p3: 'p3' });
    expect(result.winnerKey).toBe('p1');
    expect(result.points).toBe(15); // 3 + 12
  });
});
