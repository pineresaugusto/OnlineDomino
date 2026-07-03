'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { PlayerView, PlacedTile, Tile as TileT } from '@domino/shared';
import { Tile } from './Tile';

const MAX_HALF = 24; // px por mitad de ficha (tamaño máximo)
const MIN_HALF = 10; // tamaño mínimo si ni doblando cabe
const GAP = 3;

interface Placed {
  left: number;
  top: number;
  horizontal: boolean;
  tile: TileT;
}

interface Layout {
  tiles: Placed[];
  width: number;
  height: number;
}

/**
 * Serpentín clásico: la cadena avanza en horizontal y al llegar al borde
 * la ficha gira 90° y baja a la siguiente corrida, en sentido contrario.
 * Los dobles van perpendiculares a la corrida.
 */
function layoutSnake(board: PlacedTile[], availW: number, half: number): Layout {
  const L = half * 2; // largo de ficha
  const S = half;     // ancho de ficha
  const tiles: Placed[] = [];
  let dir: 1 | -1 = 1;
  let x = 0;          // frente de avance (left si dir=1, right si dir=-1)
  let centerY = half; // eje vertical de la corrida actual
  let minX = 0, maxX = 0, maxY = 0;

  for (const p of board) {
    const w = p.isDouble ? S : L;
    const fits = dir === 1 ? x + w <= availW : x - w >= 0;

    if (!fits && tiles.length > 0) {
      // Esquina: esta ficha gira 90° (vertical) y conecta con la corrida de abajo.
      const left = dir === 1 ? availW - S : 0;
      const top = centerY - S / 2;
      tiles.push({ left, top, horizontal: false, tile: p.tile });
      minX = Math.min(minX, left); maxX = Math.max(maxX, left + S); maxY = Math.max(maxY, top + L);
      centerY += L;
      dir = dir === 1 ? -1 : 1;
      x = dir === -1 ? left - GAP : left + S + GAP;
      continue;
    }

    const left = dir === 1 ? x : x - w;
    const top = p.isDouble ? centerY - half : centerY - half / 2;
    const h = p.isDouble ? L : S;
    // En corridas hacia la izquierda la ficha se lee al revés.
    const tile: TileT = dir === 1 || p.isDouble ? p.tile : [p.tile[1], p.tile[0]];
    tiles.push({ left, top, horizontal: !p.isDouble, tile });
    minX = Math.min(minX, left); maxX = Math.max(maxX, left + w); maxY = Math.max(maxY, top + h);
    x += dir * (w + GAP);
  }

  // Normaliza al origen
  for (const t of tiles) { t.left -= minX; }
  return { tiles, width: maxX - minX, height: maxY };
}

export function Board({ view }: { view: PlayerView }) {
  const { board, openEnds } = view;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>({ tiles: [], width: 0, height: 0 });
  const [half, setHalf] = useState(MAX_HALF);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      if (board.length === 0) { setLayout({ tiles: [], width: 0, height: 0 }); return; }
      const availW = el.clientWidth - 20;
      const availH = el.clientHeight - 24;
      // La ficha más grande posible cuyo serpentín quepa a lo alto.
      for (let h = MAX_HALF; h >= MIN_HALF; h -= 2) {
        const l = layoutSnake(board, availW, h);
        if (l.height <= availH || h <= MIN_HALF) {
          setLayout(l);
          setHalf(h);
          return;
        }
      }
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
          <div
            className="board snake"
            style={{ width: layout.width, height: layout.height, '--half': `${half}px` } as React.CSSProperties}
          >
            {layout.tiles.map((p, i) => (
              <div key={i} className="btile" style={{ left: p.left, top: p.top }}>
                <Tile tile={p.tile} horizontal={p.horizontal} />
              </div>
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
