import { GameState, Tile, PlacedTile, PlayerView, Ruleset } from './types';

export function isDouble(tile: Tile): boolean {
  return tile[0] === tile[1];
}

export function tileWeight(tile: Tile): number {
  return tile[0] + tile[1];
}

export function createBoneyard(): Tile[] {
  const boneyard: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      boneyard.push([i, j]);
    }
  }
  // Shuffle logic should be done at the server, but for pure rules we just define standard boneyard
  return boneyard;
}

export function canPlay(tile: Tile, openEnds: [number, number] | null): boolean {
  if (!openEnds) return true; // First turn
  return tile.includes(openEnds[0]) || tile.includes(openEnds[1]);
}

export function legalMoves(view: PlayerView): { tile: Tile, end: 'left' | 'right' | 'any' }[] {
  const moves: { tile: Tile, end: 'left' | 'right' | 'any' }[] = [];
  
  if (!view.openEnds) {
    // First turn: anything can be played
    // In Cuban rules, double-6 is forced if they have it, but for raw legal moves we might just return the whole hand
    // or filter down to double-6 if we want to enforce it at the rule level.
    view.myHand.forEach(tile => moves.push({ tile, end: 'any' }));
    return moves;
  }

  view.myHand.forEach(tile => {
    if (tile.includes(view.openEnds![0])) moves.push({ tile, end: 'left' });
    if (tile.includes(view.openEnds![1])) moves.push({ tile, end: 'right' });
  });

  return moves;
}

export function isBlocked(state: GameState): boolean {
  // A game is blocked if no one can play and all players have passed sequentially.
  // We track `passesInARow`. If it equals the number of active players, it's blocked.
  return state.passesInARow >= Object.keys(state.hands).length;
}

export function scoreHand(state: GameState, ruleset: Ruleset, winnerId: string | null, teamMap: Record<string, 'A' | 'B'>): { winnerTeam: 'A' | 'B' | null, points: number, isBlocked: boolean } {
  let isBlockedGame = isBlocked(state);
  let winnerTeam: 'A' | 'B' | null = null;
  let points = 0;

  if (winnerId) {
    // Someone played their last tile
    winnerTeam = teamMap[winnerId];
    // Calculate sum of all opponents' tiles (in 2v2 Cuban) or all other players (FFA)
    for (const [id, hand] of Object.entries(state.hands)) {
      if (teamMap[id] !== winnerTeam) {
        points += hand.reduce((sum, tile) => sum + tile[0] + tile[1], 0);
      }
    }
    
    // Check for Capicúa (if last played tile can be played on both ends)
    // Actually, Capicúa is when the last tile could have been played on either side of the board.
    // To do this purely here, we would need to know the board state BEFORE the last tile was placed.
    // Since we don't store history here, we will just add a configurable capicua bonus later if needed, 
    // or just assume standard points for now. Let's return the basic points.
  } else if (isBlockedGame) {
    // Blocked game: team with lowest sum of tiles wins
    const teamSums = { A: 0, B: 0 };
    for (const [id, hand] of Object.entries(state.hands)) {
      const sum = hand.reduce((s, tile) => s + tile[0] + tile[1], 0);
      const t = teamMap[id];
      if (t) teamSums[t] += sum;
    }

    if (teamSums.A < teamSums.B) {
      winnerTeam = 'A';
      points = teamSums.B; // In cuban, you get the opponents points
    } else if (teamSums.B < teamSums.A) {
      winnerTeam = 'B';
      points = teamSums.A;
    } else {
      // Tie: nobody wins points or whoever caused the block loses... depends on exact rules
      winnerTeam = null; // Tie
      points = 0;
    }
  }

  return { winnerTeam, points, isBlocked: isBlockedGame };
}

export function dealTiles(playerIds: string[], ruleset: Ruleset): { hands: Record<string, Tile[]>, boneyard: Tile[] } {
  let boneyard = createBoneyard();
  // Shuffle
  boneyard = boneyard.sort(() => Math.random() - 0.5);
  
  const hands: Record<string, Tile[]> = {};
  playerIds.forEach(id => hands[id] = []);
  
  // Basic distribution: 7 tiles each
  playerIds.forEach(id => {
    for (let i = 0; i < 7; i++) {
      if (boneyard.length > 0) hands[id].push(boneyard.pop()!);
    }
  });

  return { hands, boneyard };
}

export function whoStarts(hands: Record<string, Tile[]>): string {
  // Find highest double
  let highestDouble = -1;
  let starter = Object.keys(hands)[0];

  for (const [playerId, hand] of Object.entries(hands)) {
    for (const tile of hand) {
      if (isDouble(tile) && tile[0] > highestDouble) {
        highestDouble = tile[0];
        starter = playerId;
      }
    }
  }
  
  // If no double, find highest tile...
  if (highestDouble === -1) {
      let highestWeight = -1;
      for (const [playerId, hand] of Object.entries(hands)) {
        for (const tile of hand) {
            if (tileWeight(tile) > highestWeight) {
                highestWeight = tileWeight(tile);
                starter = playerId;
            }
        }
      }
  }

  return starter;
}

export function applyMove(state: GameState, move: { tile: Tile, end: 'left' | 'right' | 'any' }, playerId: string): GameState {
  // Pure function to apply a move and return new state
  const newState = { ...state };
  newState.hands = { ...state.hands };
  
  // Robust filter for removing tile from hand in either orientation
  newState.hands[playerId] = state.hands[playerId].filter(t => 
    !((t[0] === move.tile[0] && t[1] === move.tile[1]) || (t[0] === move.tile[1] && t[1] === move.tile[0]))
  );
  
  newState.board = [...state.board];

  let orientedTile = move.tile;
  if (!state.openEnds) {
    newState.openEnds = [move.tile[0], move.tile[1]];
    const placedTile: PlacedTile = {
      tile: orientedTile,
      isDouble: isDouble(move.tile),
      placedBy: playerId
    };
    newState.board.push(placedTile);
  } else {
    if (move.end === 'left') {
      const matchIndex = move.tile.indexOf(state.openEnds[0]);
      const otherValue = move.tile[matchIndex === 0 ? 1 : 0];
      newState.openEnds = [otherValue, state.openEnds[1]];
      
      // Left end play: we want the matched value on the right, other value on the left
      orientedTile = [otherValue, state.openEnds[0]];
      const placedTile: PlacedTile = {
        tile: orientedTile,
        isDouble: isDouble(move.tile),
        placedBy: playerId
      };
      newState.board.unshift(placedTile);
    } else {
      const matchIndex = move.tile.indexOf(state.openEnds[1]);
      const otherValue = move.tile[matchIndex === 0 ? 1 : 0];
      newState.openEnds = [state.openEnds[0], otherValue];
      
      // Right end play: we want the matched value on the left, other value on the right
      orientedTile = [state.openEnds[1], otherValue];
      const placedTile: PlacedTile = {
        tile: orientedTile,
        isDouble: isDouble(move.tile),
        placedBy: playerId
      };
      newState.board.push(placedTile);
    }
  }

  newState.passesInARow = 0;
  newState.isFirstTurn = false;
  return newState;
}
