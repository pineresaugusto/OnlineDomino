'use client';

import { legalMoves } from '@domino/shared';
import { useGame } from '../GameProvider';
import { Players } from '../Players';
import { Scoreboard } from '../Scoreboard';
import { Board } from '../Board';
import { Hand } from '../Hand';

const EMOTES = ['👏', '🔥', '😅', '🙈', '🎯', '🙌'];

export function Game() {
  const { view, room, myId, isMyTurn, playTile, pass, sendEmote, sendChat, nameOf } = useGame();
  if (!view || !room) return <div className="screen">Repartiendo…</div>;

  const myTeam = room.seats.find((s) => s.playerId === myId)?.team ?? null;
  const noMoves = isMyTurn && legalMoves(view).length === 0;
  const turnKey = `${view.turn}-${view.board.length}`;

  const chat = () => {
    const msg = window.prompt('Mensaje:');
    if (msg && msg.trim()) sendChat(msg.trim());
  };

  return (
    <div className="screen" style={{ gap: 10, paddingTop: 14 }}>
      <Players seats={room.seats} myId={myId} view={view} />
      <Scoreboard view={view} targetScore={room.targetScore} myTeam={myTeam} />

      <Board view={view} />

      <div className="turnbar"><i className="run" key={turnKey} /></div>
      <div className="turn-lbl">
        {isMyTurn
          ? (noMoves ? <>No tienes jugada — <b>debes pasar</b></> : <>Tu turno — <b>toca una ficha resaltada</b></>)
          : <>Turno de <b>{nameOf(view.turn)}</b>…</>}
      </div>

      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Hand view={view} isMyTurn={isMyTurn} onPlay={playTile} />

        {noMoves && (
          <button className="btn" onClick={pass}>Pasar turno</button>
        )}

        <div className="emotes">
          {EMOTES.map((e) => (
            <button key={e} className="emote" onClick={() => sendEmote(e)}>{e}</button>
          ))}
          <button className="emote" onClick={chat}>💬</button>
        </div>
      </div>
    </div>
  );
}
