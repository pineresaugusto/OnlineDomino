'use client';

import { useState } from 'react';
import { useGame } from '../GameProvider';
import { Logo } from '../Logo';

export function Onboarding() {
  const { setNick, goto } = useGame();
  const [value, setValue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setNick(value.trim() || 'Jugador');
    goto('menu');
  };

  return (
    <div className="screen" style={{ justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <div className="spacer" />
      <Logo />
      <div className="brand" style={{ fontSize: 36, lineHeight: 1.05 }}>
        La Puerca<br />Domin<span className="accent">ó</span>
      </div>
      <p className="tag">Juega con tus amigos en segundos. Sin registro.</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
        <input
          className="field"
          placeholder="Escribe tu apodo…"
          maxLength={14}
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn" type="submit">Jugar ▸</button>
      </form>
      <div className="spacer" />
    </div>
  );
}
