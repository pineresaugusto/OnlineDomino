// ── Reglas puras (verdad del juego). Se usan en el servidor como autoridad
//    y en el cliente para resaltar jugadas legales (UX).
//    Fase 0: firmas + utilidades básicas. La lógica real llega en la Fase B1.
import type { Tile, GameState, PlayerView, Ruleset, BoardEnd } from './types';

/** Genera el set doble-6 (28 fichas). */
export function createDoubleSixSet(): Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push({ a, b });
    }
  }
  return tiles;
}

/** Baraja una copia del arreglo (Fisher–Yates). */
export function shuffle<T>(input: readonly T[], rnd: () => number = Math.random): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

const NOT_IMPL = 'Pendiente de implementar en la Fase B1 (motor de reglas)';

/** Reparte fichas para N jugadores; devuelve manos + pozo restante. */
export function dealTiles(_players: number): { hands: Tile[][]; boneyard: Tile[] } {
  throw new Error(NOT_IMPL);
}

/** Jugadas legales para la vista dada (ficha + extremo donde se pega). */
export function legalMoves(_view: PlayerView): { tile: Tile; end: BoardEnd }[] {
  throw new Error(NOT_IMPL);
}

/** Aplica una jugada y devuelve el nuevo estado (inmutable). */
export function applyMove(_state: GameState, _move: { tile: Tile; end: BoardEnd; playerId: string }): GameState {
  throw new Error(NOT_IMPL);
}

/** ¿La mano está trancada (nadie puede jugar)? */
export function isBlocked(_state: GameState): boolean {
  throw new Error(NOT_IMPL);
}

/** Puntaje de la mano según el reglamento. */
export function scoreHand(_state: GameState, _ruleset: Ruleset): Record<string, number> {
  throw new Error(NOT_IMPL);
}

/** Quién abre la mano (doble más alto en la primera; ganador en las siguientes). */
export function whoStarts(_state: GameState): string {
  throw new Error(NOT_IMPL);
}
