import type { Tile as TileT } from '@domino/shared';
import { PIPS } from '@/lib/pips';

function Half({ v }: { v: number }) {
  return (
    <div className="half">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={'pip' + (PIPS[v]?.includes(i) ? '' : ' off')} />
      ))}
    </div>
  );
}

export function Tile({
  tile,
  horizontal,
  variant,
  onClick,
}: {
  tile: TileT;
  horizontal?: boolean;
  variant?: 'legal' | 'dim' | '';
  onClick?: () => void;
}) {
  const cls = ['tile', horizontal ? 'h' : '', variant ?? '', onClick ? 'play' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={onClick}>
      <Half v={tile[0]} />
      <div className="divider" />
      <Half v={tile[1]} />
    </div>
  );
}
