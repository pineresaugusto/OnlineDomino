'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { PlayerView } from '@domino/shared';
import { Tile } from './Tile';

const MAX_HALF = 34; // px por mitad de ficha (tamaño máximo)
const MIN_HALF = 14; // por debajo de esto los puntos no se leen: mejor partir la línea
const GAP = 4;       // debe coincidir con el gap del CSS de .board

export function Board({ view }: { view: PlayerView }) {
  const { board, openEnds } = view;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [half, setHalf] = useState(MAX_HALF);
  const [multiline, setMultiline] = useState(false);

  // La cadena va en una sola línea que se encoge cuando se llena (zoom out).
  // Si ni al tamaño mínimo legible cabe, continúa en otra línea recta.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      // Ancho de la cadena en "mitades": los dobles van verticales (1), el resto horizontal (2).
      const units = board.reduce((u, p) => u + (p.isDouble ? 1 : 2), 0);
      if (units === 0) { setHalf(MAX_HALF); setMultiline(false); return; }
      const gaps = GAP * Math.max(0, board.length - 1);
      const avail = el.clientWidth - 20 - gaps;
      const fit = Math.floor(avail / units);
      setHalf(Math.max(MIN_HALF, Math.min(MAX_HALF, fit)));
      setMultiline(fit < MIN_HALF);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [board]);

  return (
    <div className="board-wrap" ref={wrapRef}>
      {board.length === 0 ? (
        <span className="empty-board">La mesa está vacía — abre la mano</span>
      ) : (
        <>
          <div className={`board${multiline ? ' multi' : ''}`} style={{ '--half': `${half}px` } as React.CSSProperties}>
            {board.map((p, i) => (
              <Tile key={i} tile={p.tile} horizontal={!p.isDouble} />
            ))}
          </div>
          {openEnds && (
            <>
              <span className="end-pad l">◂ {openEnds[0]}</span>
              <span className="end-pad r">{openEnds[1]} ▸</span>
            </>
          )}
        </>
      )}
    </div>
  );
}
