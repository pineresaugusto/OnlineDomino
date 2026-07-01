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

export function Logo() {
  return (
    <div className="logo">
      <Half v={6} />
      <div className="divider" />
      <Half v={6} />
    </div>
  );
}
