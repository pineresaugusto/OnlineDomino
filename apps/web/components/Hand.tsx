'use client';

import { useState } from 'react';
import { legalMoves, type PlayerView, type Tile as TileT } from '@domino/shared';
import { Tile } from './Tile';

const key = (t: TileT) => `${t[0]}-${t[1]}`;

export function Hand({
  view,
  isMyTurn,
  onPlay,
}: {
  view: PlayerView;
  isMyTurn: boolean;
  onPlay: (tile: TileT, end: 'left' | 'right') => void;
}) {
  const [choosing, setChoosing] = useState<TileT | null>(null);

  // Mapa ficha -> extremos legales
  const legal = new Map<string, Set<'left' | 'right'>>();
  if (isMyTurn) {
    for (const m of legalMoves(view)) {
      const k = key(m.tile);
      if (!legal.has(k)) legal.set(k, new Set());
      // 'any' (primera jugada) lo tratamos como 'right'
      legal.get(k)!.add(m.end === 'any' ? 'right' : m.end);
    }
  }

  const tap = (t: TileT) => {
    const ends = legal.get(key(t));
    if (!ends || ends.size === 0) return;
    if (ends.size === 1) onPlay(t, [...ends][0]);
    else setChoosing(t); // cabe en ambos extremos → preguntar
  };

  if (choosing) {
    return (
      <div className="hand-zone">
        <p className="turn-lbl" style={{ marginBottom: 8 }}>
          ¿En qué extremo juegas la <b>{choosing[0]}|{choosing[1]}</b>?
        </p>
        <div className="actions-row">
          <button className="btn ghost" onClick={() => { onPlay(choosing, 'left'); setChoosing(null); }}>◂ Izquierda ({view.openEnds?.[0]})</button>
          <button className="btn ghost" onClick={() => { onPlay(choosing, 'right'); setChoosing(null); }}>Derecha ({view.openEnds?.[1]}) ▸</button>
        </div>
        <button className="back" style={{ margin: '10px auto 0' }} onClick={() => setChoosing(null)}>Cancelar</button>
      </div>
    );
  }

  return (
    <div className="hand">
      {view.myHand.map((t, i) => {
        const isLegal = legal.has(key(t));
        return (
          <Tile
            key={i}
            tile={t}
            variant={isMyTurn ? (isLegal ? 'legal' : 'dim') : ''}
            onClick={isLegal ? () => tap(t) : undefined}
          />
        );
      })}
    </div>
  );
}
