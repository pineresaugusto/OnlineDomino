'use client';

import { useGame } from './GameProvider';

export function ResultOverlay() {
  const { result, room, myId, rematch, leaveRoom } = useGame();
  if (!result) return null;

  const myTeam = room?.seats.find((s) => s.playerId === myId)?.team ?? null;

  let title: React.ReactNode = '¡Fin de la mano!';
  let sub = '';
  if (result.isBlocked && result.winnerTeam == null) {
    title = 'Mano trancada';
    sub = 'Empate — nadie suma puntos';
  } else if (result.winnerTeam && myTeam && result.winnerTeam === myTeam) {
    title = <>¡Ganó <span className="accent">tu equipo</span>!</>;
    sub = result.points ? `+${result.points} puntos` : '';
  } else if (result.winnerTeam) {
    title = <>Ganó el equipo <span className="accent">{String(result.winnerTeam)}</span></>;
    sub = result.points ? `${result.points} puntos para ellos` : '';
  }

  return (
    <div className="overlay">
      <div className="result-card">
        <div className="trophy">{result.isBlocked && result.winnerTeam == null ? '🤝' : '🏆'}</div>
        <div className="result">{title}</div>
        {sub && <div className="result-sub">{sub}</div>}
        <div className="result-actions">
          <button className="btn" onClick={rematch}>↻ Revancha</button>
          <button className="btn ghost" onClick={leaveRoom}>Salir al menú</button>
        </div>
      </div>
    </div>
  );
}
