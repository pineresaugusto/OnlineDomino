'use client';

import type { Seat } from '@domino/shared';
import { useGame } from '../GameProvider';

function SeatRow({ seat, isMe }: { seat: Seat; isMe: boolean }) {
  const isBot = seat.connection === 'bot';
  return (
    <div className="seat">
      <div className="avatar">{isBot ? '🤖' : seat.name?.[0]?.toUpperCase() ?? '?'}</div>
      <div>
        <div className="nm">{seat.name}{isMe ? ' (tú)' : ''}</div>
        <div className="rl">{isBot ? 'Bot' : seat.connection === 'reconnecting' ? 'Reconectando…' : 'Conectado'}</div>
      </div>
      {isBot && <span className="tagbot">IA</span>}
    </div>
  );
}

export function Lobby() {
  const { room, code, myId, addBot, startGame, showToast } = useGame();
  if (!room) return <div className="screen">Cargando sala…</div>;

  const roomCode = room.code ?? code ?? '';
  const capacity = room.mode === 'team2v2' || room.mode === 'ffa' ? 4 : 2;
  const isHost = myId === room.hostId;
  const canStart = isHost && room.seats.length >= 2;
  const emptyCount = capacity - room.seats.length;

  const link = typeof window !== 'undefined' ? `${window.location.origin}?code=${roomCode}` : '';
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); showToast('Link copiado'); }
    catch { showToast(link); }
  };
  const shareWA = () => {
    const text = encodeURIComponent(`¡Vente a jugar dominó! Únete a mi sala (${roomCode}): ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const teamA = room.seats.filter((s) => s.team === 'A' || s.team === null);
  const teamB = room.seats.filter((s) => s.team === 'B');
  const isTeams = room.mode === 'team2v2';

  return (
    <div className="screen" style={{ gap: 16 }}>
      <div className="code-card">
        <div className="lbl">Código de sala</div>
        <div className="code">{roomCode}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={copyLink}>🔗 Copiar link</button>
          <button className="btn wa" onClick={shareWA}>Compartir</button>
        </div>
      </div>

      {isTeams ? (
        <div className="teams">
          <div className="team us">
            <h4>Nosotros</h4>
            {teamA.map((s) => <SeatRow key={s.playerId} seat={s} isMe={s.playerId === myId} />)}
          </div>
          <div className="team">
            <h4>Ellos</h4>
            {teamB.length ? teamB.map((s) => <SeatRow key={s.playerId} seat={s} isMe={s.playerId === myId} />)
              : <div className="seat empty">Esperando rivales…</div>}
          </div>
        </div>
      ) : (
        <div className="team us" style={{ width: '100%' }}>
          <h4>Jugadores</h4>
          {room.seats.map((s) => <SeatRow key={s.playerId} seat={s} isMe={s.playerId === myId} />)}
        </div>
      )}

      {isHost && emptyCount > 0 && (
        <button className="btn ghost" onClick={addBot}>+ Agregar bot ({emptyCount} libre{emptyCount > 1 ? 's' : ''})</button>
      )}

      <div className="spacer" />
      {isHost ? (
        <button className="btn" onClick={startGame} disabled={!canStart}>
          {canStart ? 'Empezar partida ▸' : 'Faltan jugadores…'}
        </button>
      ) : (
        <p style={{ textAlign: 'center', opacity: .7, fontSize: 13 }}>Esperando a que el anfitrión empiece…</p>
      )}
    </div>
  );
}
