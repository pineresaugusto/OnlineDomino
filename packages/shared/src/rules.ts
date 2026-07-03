import { GameState, Tile, PlacedTile, PlayerView, Ruleset } from './types';

export function isDouble(tile: Tile): boolean {
  return tile[0] === tile[1];
}

export function tileWeight(tile: Tile): number {
  return tile[0] + tile[1];
}

export function sameTile(a: Tile, b: Tile): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

export function handWeight(hand: Tile[]): number {
  return hand.reduce((sum, t) => sum + t[0] + t[1], 0);
}

export function createBoneyard(): Tile[] {
  const boneyard: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      boneyard.push([i, j]);
    }
  }
  return boneyard;
}

export function canPlay(tile: Tile, openEnds: [number, number] | null): boolean {
  if (!openEnds) return true; // primera jugada
  return tile.includes(openEnds[0]) || tile.includes(openEnds[1]);
}

export function legalMoves(view: Pick<PlayerView, 'myHand' | 'openEnds' | 'requiredOpener'>): { tile: Tile, end: 'left' | 'right' | 'any' }[] {
  const moves: { tile: Tile, end: 'left' | 'right' | 'any' }[] = [];

  if (!view.openEnds) {
    // Primera jugada: si hay salida forzada (doble más alto de la primera mano), solo esa ficha.
    if (view.requiredOpener) {
      const opener = view.myHand.find(t => sameTile(t, view.requiredOpener!));
      if (opener) moves.push({ tile: opener, end: 'any' });
      return moves;
    }
    view.myHand.forEach(tile => moves.push({ tile, end: 'any' }));
    return moves;
  }

  view.myHand.forEach(tile => {
    if (tile.includes(view.openEnds![0])) moves.push({ tile, end: 'left' });
    if (tile.includes(view.openEnds![1])) moves.push({ tile, end: 'right' });
  });

  return moves;
}

/** En modo "draw" hay que robar del pozo antes de poder pasar. */
export function mustDraw(view: Pick<PlayerView, 'myHand' | 'openEnds' | 'requiredOpener' | 'boneyardCount'>, ruleset: Ruleset): boolean {
  return ruleset === 'draw' && view.boneyardCount > 0 && legalMoves(view).length === 0;
}

export function isBlocked(state: GameState): boolean {
  // Trancado: todos los jugadores pasaron seguidos.
  return state.passesInARow >= Object.keys(state.hands).length;
}

/**
 * Puntúa una mano terminada.
 * keyMap: playerId -> clave de puntuación ('A'/'B' en equipos y 1v1, playerId en FFA).
 */
export function scoreHand(
  state: GameState,
  ruleset: Ruleset,
  winnerId: string | null,
  keyMap: Record<string, string>
): { winnerKey: string | null, winnerId: string | null, points: number, isBlocked: boolean } {
  const blocked = isBlocked(state);

  if (winnerId) {
    // Alguien dominó: suma las fichas de todas las claves rivales.
    const winnerKey = keyMap[winnerId];
    let points = 0;
    for (const [id, hand] of Object.entries(state.hands)) {
      if (keyMap[id] !== winnerKey) points += handWeight(hand);
    }
    return { winnerKey, winnerId, points, isBlocked: blocked };
  }

  if (!blocked) return { winnerKey: null, winnerId: null, points: 0, isBlocked: false };

  // Trancado: gana la clave con menos puntos en mano; se lleva los puntos de los demás.
  const keySums: Record<string, number> = {};
  for (const [id, hand] of Object.entries(state.hands)) {
    const k = keyMap[id];
    keySums[k] = (keySums[k] ?? 0) + handWeight(hand);
  }
  const entries = Object.entries(keySums).sort((a, b) => a[1] - b[1]);
  if (entries.length < 2 || entries[0][1] === entries[1][1]) {
    return { winnerKey: null, winnerId: null, points: 0, isBlocked: true }; // empate
  }
  const winnerKey = entries[0][0];
  const points = entries.slice(1).reduce((s, [, v]) => s + v, 0);
  // "Ganador" individual: el jugador de la clave ganadora con menos puntos en mano.
  const members = Object.entries(state.hands)
    .filter(([id]) => keyMap[id] === winnerKey)
    .sort((a, b) => handWeight(a[1]) - handWeight(b[1]));
  return { winnerKey, winnerId: members[0]?.[0] ?? null, points, isBlocked: true };
}

export function dealTiles(playerIds: string[], ruleset: Ruleset): { hands: Record<string, Tile[]>, boneyard: Tile[] } {
  let boneyard = createBoneyard();
  // Barajar (Fisher–Yates)
  for (let i = boneyard.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [boneyard[i], boneyard[j]] = [boneyard[j], boneyard[i]];
  }

  const hands: Record<string, Tile[]> = {};
  playerIds.forEach(id => hands[id] = []);

  // 7 fichas por jugador
  playerIds.forEach(id => {
    for (let i = 0; i < 7; i++) {
      if (boneyard.length > 0) hands[id].push(boneyard.pop()!);
    }
  });

  return { hands, boneyard };
}

/**
 * Quién sale en la primera mano: el doble más alto (salida forzada);
 * si nadie tiene dobles, la ficha más pesada (sin forzar).
 */
export function whoStarts(hands: Record<string, Tile[]>): { starter: string, opener: Tile | null } {
  let highestDouble = -1;
  let starter = Object.keys(hands)[0];
  let opener: Tile | null = null;

  for (const [playerId, hand] of Object.entries(hands)) {
    for (const tile of hand) {
      if (isDouble(tile) && tile[0] > highestDouble) {
        highestDouble = tile[0];
        starter = playerId;
        opener = tile;
      }
    }
  }

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

  return { starter, opener };
}

export function applyMove(state: GameState, move: { tile: Tile, end: 'left' | 'right' | 'any' }, playerId: string): GameState {
  const newState = { ...state };
  newState.hands = { ...state.hands };
  newState.hands[playerId] = state.hands[playerId].filter(t => !sameTile(t, move.tile));
  newState.board = [...state.board];

  const doubleTile = isDouble(move.tile);

  if (!state.openEnds) {
    newState.openEnds = [move.tile[0], move.tile[1]];
    newState.board.push({ tile: move.tile, isDouble: doubleTile, placedBy: playerId });
  } else if (move.end === 'left') {
    const matchValue = state.openEnds[0];
    const otherValue = move.tile[0] === matchValue ? move.tile[1] : move.tile[0];
    newState.openEnds = [otherValue, state.openEnds[1]];
    // Orientada para leerse izquierda→derecha: [extremo nuevo | valor que conecta]
    newState.board.unshift({ tile: [otherValue, matchValue], isDouble: doubleTile, placedBy: playerId });
  } else {
    const matchValue = state.openEnds[1];
    const otherValue = move.tile[0] === matchValue ? move.tile[1] : move.tile[0];
    newState.openEnds = [state.openEnds[0], otherValue];
    newState.board.push({ tile: [matchValue, otherValue], isDouble: doubleTile, placedBy: playerId });
  }

  newState.passesInARow = 0;
  newState.isFirstTurn = false;
  newState.requiredOpener = null;
  return newState;
}
