'use client';

import { useGame } from './GameProvider';
import { Tile } from './Tile';

export function ResultOverlay() {
  const { result, room, myId, rematch, leaveRoom, nameOf } = useGame();
  if (!result || !room) return null;

  const myKey = room.mode === 'ffa'
    ? myId
    : room.seats.find((s) => s.playerId === myId)?.team ?? null;
  const iWon = result.winnerKey != null && result.winnerKey === myKey;
  const isTie = result.winnerKey == null;
  const isMatch = result.kind === 'match';
  const solo = room.mode !== 'team2v2';

  let title: React.ReactNode;
  if (isTie) {
    title = 'Mano trancada';
  } else if (iWon) {
    title = isMatch
      ? <>¡<span className="accent">Ganaste</span> la partida!</>
      : solo ? <>¡Ganaste la mano!</> : <>¡Ganó <span className="accent">tu equipo</span>!</>;
  } else {
    title = <>{isMatch ? 'Partida para' : 'Mano para'} <span className="accent">{result.winnerName ?? 'el rival'}</span></>;
  }

  const sub = isTie
    ? 'Empate — nadie suma puntos'
    : isMatch
      ? null
      : result.points
        ? (iWon ? `+${result.points} puntos` : `+${result.points} puntos para ${solo ? (result.winnerName ?? 'el rival') : 'ellos'}`)
        : null;

  // Fichas con las que se quedaron los demás
  const leftovers = !isMatch && result.fullHands
    ? Object.entries(result.fullHands).filter(([id, hand]) => id !== myId && hand.length > 0)
    : [];

  const scoreLine = result.scores
    ? Object.entries(result.scores)
        .map(([k, v]) => {
          const label = room.mode === 'ffa' ? nameOf(k) : (k === myKey ? (solo ? 'Tú' : 'Nosotros') : (solo ? (room.seats.find(s => s.team === k)?.name ?? k) : 'Ellos'));
          return `${label} ${v}`;
        })
        .join(' · ')
    : null;

  return (
    <div className="overlay">
      <div className="result-card">
        <div className="trophy">{isTie ? '🤝' : isMatch ? '👑' : '🏆'}</div>
        <div className="result">{title}</div>
        {result.isBlocked && !isTie && <div className="result-sub">Mano trancada</div>}
        {sub && <div className="result-sub">{sub}</div>}

        {leftovers.length > 0 && (
          <div className="leftovers">
            {leftovers.map(([id, hand]) => (
              <div key={id} className="leftover-row">
                <span className="leftover-name">{nameOf(id)} se quedó con:</span>
                <div className="leftover-tiles">
                  {hand.map((t, i) => <Tile key={i} tile={t} horizontal />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {scoreLine && (
          <div className="result-sub" style={{ marginTop: 10 }}>
            <b>{scoreLine}</b> · meta {room.targetScore}
          </div>
        )}

        <div className="result-actions">
          <button className="btn" onClick={rematch}>
            {isMatch ? '↻ Otra partida' : 'Siguiente mano ▸'}
          </button>
          <button className="btn ghost" onClick={leaveRoom}>Salir al menú</button>
        </div>
      </div>
    </div>
  );
}
