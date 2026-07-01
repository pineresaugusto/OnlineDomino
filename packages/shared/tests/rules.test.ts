import { describe, it, expect } from 'vitest';
import { dealTiles, legalMoves, isBlocked, whoStarts, applyMove, createBoneyard, scoreHand } from '../src/rules';
import { PlayerView, GameState } from '../src/types';

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

  it('should determine who starts based on highest double', () => {
    const hands = {
      p1: [[0, 0], [1, 2]] as [number, number][],
      p2: [[3, 3], [4, 5]] as [number, number][],
      p3: [[6, 6], [1, 1]] as [number, number][], // p3 has 6-6
      p4: [[2, 2], [4, 4]] as [number, number][]
    };
    expect(whoStarts(hands)).toBe('p3');
  });

  it('should allow any move on first turn', () => {
    const view: PlayerView = {
      myHand: [[6, 6], [3, 4]],
      boneyardCount: 0,
      board: [],
      opponentHands: {},
      turn: 'p1',
      passesInARow: 0,
      scores: { A: 0, B: 0 },
      openEnds: null,
      isFirstTurn: true
    };
    const moves = legalMoves(view);
    expect(moves.length).toBe(2);
    expect(moves[0].end).toBe('any');
  });

  it('should only allow moves matching open ends', () => {
    const view: PlayerView = {
      myHand: [[6, 6], [3, 4], [1, 6]],
      boneyardCount: 0,
      board: [],
      opponentHands: {},
      turn: 'p1',
      passesInARow: 0,
      scores: { A: 0, B: 0 },
      openEnds: [6, 2],
      isFirstTurn: false
    };
    const moves = legalMoves(view);
    expect(moves.length).toBe(2); // [6,6] and [1,6]
    expect(moves.some(m => m.tile[0] === 3 && m.tile[1] === 4)).toBe(false);
  });

  it('should detect a blocked game', () => {
    const state: GameState = {
      boneyard: [],
      board: [],
      hands: { p1: [], p2: [], p3: [], p4: [] },
      turn: 'p1',
      passesInARow: 4,
      scores: { A: 0, B: 0 },
      openEnds: [1, 2],
      isFirstTurn: false
    };
    expect(isBlocked(state)).toBe(true);
    
    state.passesInARow = 3;
    expect(isBlocked(state)).toBe(false);
  });

  it('should score a hand correctly when someone wins', () => {
    const state: GameState = {
      boneyard: [],
      board: [],
      hands: { 
        p1: [], // Winner
        p2: [[1, 2], [3, 4]], // Opponent B (3 + 7 = 10)
        p3: [[0, 0]], // Partner A (0)
        p4: [[6, 6], [5, 5]] // Opponent B (12 + 10 = 22)
      },
      turn: 'p1',
      passesInARow: 0,
      scores: { A: 0, B: 0 },
      openEnds: null,
      isFirstTurn: false
    };

    const teamMap: Record<string, 'A' | 'B'> = { p1: 'A', p2: 'B', p3: 'A', p4: 'B' };
    const result = scoreHand(state, 'cuban', 'p1', teamMap);
    
    expect(result.winnerTeam).toBe('A');
    expect(result.points).toBe(32); // 10 + 22 from opponents
    expect(result.isBlocked).toBe(false);
  });

  it('should score a blocked game correctly', () => {
    const state: GameState = {
      boneyard: [],
      board: [],
      hands: { 
        p1: [[1, 1]], // A (2)
        p2: [[2, 2]], // B (4)
        p3: [[0, 0]], // A (0)
        p4: [[3, 3]]  // B (6)
      },
      turn: 'p1',
      passesInARow: 4,
      scores: { A: 0, B: 0 },
      openEnds: [6, 5],
      isFirstTurn: false
    };

    const teamMap: Record<string, 'A' | 'B'> = { p1: 'A', p2: 'B', p3: 'A', p4: 'B' };
    const result = scoreHand(state, 'cuban', null, teamMap);
    
    // Team A has 2 points. Team B has 10 points.
    // Team A wins and gets opponents' points (10)
    expect(result.winnerTeam).toBe('A');
    expect(result.points).toBe(10);
    expect(result.isBlocked).toBe(true);
  });
});
