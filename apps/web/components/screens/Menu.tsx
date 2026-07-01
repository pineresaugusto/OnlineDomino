'use client';

import { useGame } from '../GameProvider';

export function Menu() {
  const { nick, goto, practiceVsAI } = useGame();
  return (
    <div className="screen" style={{ gap: 6 }}>
      <div className="hello serif">
        Hola, {nick || 'jugador'} 👋
        <small>¿Qué quieres hacer?</small>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
        <button className="mcard primary" onClick={() => goto('create')}>
          <div className="ic">🎲</div>
          <div><h3>Crear sala</h3><p>Invita a tu pareja y rivales por link</p></div>
          <div className="chev">›</div>
        </button>
        <button className="mcard" onClick={() => goto('join')}>
          <div className="ic">🔑</div>
          <div><h3>Unir con código</h3><p>Entra a la sala de un amigo</p></div>
          <div className="chev">›</div>
        </button>
        <button className="mcard" onClick={practiceVsAI}>
          <div className="ic">🤖</div>
          <div><h3>Jugar vs IA</h3><p>Práctica rápida contra la máquina</p></div>
          <div className="chev">›</div>
        </button>
      </div>
      <div className="spacer" />
      <p style={{ fontSize: 11, opacity: .4, textAlign: 'center' }}>
        Modos: 2v2 en parejas · 1v1 · Todos contra todos (3–4).
      </p>
    </div>
  );
}
