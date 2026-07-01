'use client';

import { useState } from 'react';
import type { Mode, Ruleset } from '@domino/shared';
import { useGame } from '../GameProvider';

const RULESETS: { id: Ruleset; t: string; d: string }[] = [
  { id: 'cuban', t: 'Cubano 2v2', d: 'Parejas, a puntos' },
  { id: 'block', t: 'Bloqueo', d: 'Sin robar' },
  { id: 'draw', t: 'Robar', d: 'Del pozo' },
];
const MODES: { id: Mode; t: string; d: string }[] = [
  { id: 'team2v2', t: '2v2 parejas', d: '4 jugadores' },
  { id: '1v1', t: '1v1', d: 'Duelo' },
  { id: 'ffa', t: 'Todos', d: '3–4 jug.' },
];
const GOALS = [50, 100, 200];

export function CreateRoom() {
  const { goto, createRoom } = useGame();
  const [ruleset, setRuleset] = useState<Ruleset>('cuban');
  const [mode, setMode] = useState<Mode>('team2v2');
  const [goal, setGoal] = useState(100);

  return (
    <div className="screen" style={{ gap: 4 }}>
      <button className="back" onClick={() => goto('menu')}>‹ Volver</button>

      <div style={{ marginTop: 12 }}>
        <div className="label">Reglamento</div>
        <div className="chips">
          {RULESETS.map((r) => (
            <button key={r.id} className="chip" aria-checked={ruleset === r.id} onClick={() => setRuleset(r.id)}>
              <div className="t">{r.t}</div><div className="d">{r.d}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="label">Modo</div>
        <div className="chips">
          {MODES.map((m) => (
            <button key={m.id} className="chip" aria-checked={mode === m.id} onClick={() => setMode(m.id)}>
              <div className="t">{m.t}</div><div className="d">{m.d}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="label">Meta de puntos</div>
        <div className="chips">
          {GOALS.map((g) => (
            <button key={g} className="chip sm" aria-checked={goal === g} onClick={() => setGoal(g)}>
              <div className="t">{g}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="spacer" />
      <button className="btn" onClick={() => createRoom(ruleset, mode, goal)}>Crear sala ▸</button>
    </div>
  );
}
