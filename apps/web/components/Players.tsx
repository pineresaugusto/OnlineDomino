import type { PlayerView } from '@domino/shared';
import type { Seat } from '@domino/shared';

function initial(name: string, isBot: boolean) {
  return isBot ? '🤖' : (name?.[0]?.toUpperCase() ?? '?');
}

export function Players({ seats, myId, view, showTeams }: { seats: Seat[]; myId: string | null; view: PlayerView; showTeams?: boolean }) {
  const others = seats.filter((s) => s.playerId && s.playerId !== myId);
  return (
    <div className="opp-row">
      {others.map((s) => {
        const isBot = s.connection === 'bot';
        const isTurn = view.turn === s.playerId;
        const count = s.playerId ? view.opponentHands[s.playerId] ?? 0 : 0;
        const off = s.connection === 'reconnecting';
        return (
          <div key={s.playerId} className={`player ${isTurn ? 'turn' : ''} ${off ? 'off' : ''}`}>
            <div className="av">{initial(s.name, isBot)}</div>
            <div className="nm">{s.name}{showTeams && s.team ? ` · ${s.team}` : ''}</div>
            <div className="cnt">🁢 {count}{off ? ' · reconectando…' : ''}</div>
          </div>
        );
      })}
    </div>
  );
}
