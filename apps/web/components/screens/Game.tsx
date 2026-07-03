'use client';

import { legalMoves, mustDraw } from '@domino/shared';
import { useGame } from '../GameProvider';
import { Players } from '../Players';
import { Scoreboard } from '../Scoreboard';
import { Board } from '../Board';
import { Hand } from '../Hand';

const EMOTES = ['👏', '🔥', '😅', '🙈', '🎯', '🙌'];

export function Game() {
  const { view, room, myId, isMyTurn, result, turnSeconds, playTile, pass, drawTile, rematch, sendEmote, sendChat, nameOf } = useGame();
  if (!view || !room) return <div className="screen">Repartiendo…</div>;

  const playing = room.status === 'playing';
  const needsDraw = isMyTurn && playing && mustDraw(view, room.ruleset);
  const noMoves = isMyTurn && playing && !needsDraw && legalMoves(view).length === 0;
  const turnKey = `${view.turn}-${view.board.length}-${view.myHand.length}`;

  const chat = () => {
    const msg = window.prompt('Mensaje:');
    if (msg && msg.trim()) sendChat(msg.trim());
  };

  return (
    <div className="screen" style={{ gap: 10, paddingTop: 14 }}>
      <Players seats={room.seats} myId={myId} view={view} showTeams={room.mode === 'team2v2'} />
      <Scoreboard view={view} room={room} myId={myId} />

      <Board view={view} />

      {room.ruleset === 'draw' && (
        <div className="turn-lbl">Pozo: <b>{view.boneyardCount}</b> fichas</div>
      )}

      {playing && isMyTurn && (
        <div className="turnbar"><i className="run" key={turnKey} style={{ animationDuration: `${turnSeconds}s` }} /></div>
      )}
      <div className="turn-lbl">
        {!playing
          ? <>Mano terminada</>
          : isMyTurn
            ? (needsDraw
              ? <>No tienes jugada — <b>roba del pozo</b></>
              : noMoves
                ? <>No tienes jugada — <b>debes pasar</b></>
                : view.requiredOpener
                  ? <>Tu turno — <b>abre con la {view.requiredOpener[0]}|{view.requiredOpener[1]}</b></>
                  : <>Tu turno — <b>toca una ficha resaltada</b></>)
            : <>Turno de <b>{nameOf(view.turn)}</b>…</>}
      </div>

      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Hand view={view} isMyTurn={isMyTurn && playing} onPlay={playTile} />

        {needsDraw && (
          <button className="btn" onClick={drawTile}>🁠 Robar del pozo ({view.boneyardCount})</button>
        )}
        {noMoves && (
          <button className="btn" onClick={pass}>Pasar turno</button>
        )}
        {!playing && !result && (
          <button className="btn" onClick={rematch}>
            {room.status === 'matchOver' ? '↻ Nueva partida' : 'Siguiente mano ▸'}
          </button>
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
