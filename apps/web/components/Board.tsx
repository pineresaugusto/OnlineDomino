import type { PlayerView } from '@domino/shared';
import { Tile } from './Tile';

export function Board({ view }: { view: PlayerView }) {
  const { board, openEnds } = view;
  return (
    <div className="board-wrap">
      {board.length === 0 ? (
        <span className="empty-board">La mesa está vacía — abre la mano</span>
      ) : (
        <>
          <div className="board">
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
