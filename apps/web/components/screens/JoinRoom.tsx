'use client';

import { useEffect, useState } from 'react';
import { useGame } from '../GameProvider';

export function JoinRoom() {
  const { goto, joinRoom, error } = useGame();
  const [code, setCode] = useState('');

  // Deep-link: ?code=ABCD (link compartido por WhatsApp)
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code');
    if (c) setCode(c.toUpperCase());
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 3) joinRoom(code);
  };

  return (
    <div className="screen" style={{ gap: 14 }}>
      <button className="back" onClick={() => goto('menu')}>‹ Volver</button>
      <div className="spacer" />
      <div style={{ textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 600 }}>Unirse a una sala</div>
        <p className="tag">Escribe el código que te compartieron</p>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="field"
          style={{ textAlign: 'center', letterSpacing: 8, fontSize: 26, fontWeight: 700, textTransform: 'uppercase' }}
          placeholder="ABCD"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        />
        {error && <div className="err">{error}</div>}
        <button className="btn" type="submit" disabled={code.trim().length < 3}>Entrar ▸</button>
      </form>
      <div className="spacer" />
    </div>
  );
}
