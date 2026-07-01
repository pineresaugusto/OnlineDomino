'use client';

import { useEffect } from 'react';
import { useGame } from './GameProvider';
import { Onboarding } from './screens/Onboarding';
import { Menu } from './screens/Menu';
import { CreateRoom } from './screens/CreateRoom';
import { JoinRoom } from './screens/JoinRoom';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';
import { ResultOverlay } from './ResultOverlay';

export function Shell() {
  const { screen, goto, connected, toast, error, bubbles, nameOf } = useGame();

  // Si llegan por un link con ?code=, saltar a "unirse" tras el apodo.
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code');
    if (c && screen === 'menu') goto('join');
  }, [screen, goto]);

  return (
    <>
      {!connected && <div className="conn">Sin conexión con el servidor…</div>}
      {toast && <div className="toast">{toast}</div>}
      {error && screen !== 'join' && <div className="toast" style={{ background: '#c0472f', color: '#fff' }}>{error}</div>}

      {screen === 'onboarding' && <Onboarding />}
      {screen === 'menu' && <Menu />}
      {screen === 'create' && <CreateRoom />}
      {screen === 'join' && <JoinRoom />}
      {screen === 'lobby' && <Lobby />}
      {screen === 'game' && <Game />}

      {bubbles.length > 0 && (
        <div className="bubble-log">
          {bubbles.map((b) => (
            <div key={b.id} className="bubble">
              <b>{nameOf(b.playerId)}:</b> {b.text}
            </div>
          ))}
        </div>
      )}

      <ResultOverlay />
    </>
  );
}
