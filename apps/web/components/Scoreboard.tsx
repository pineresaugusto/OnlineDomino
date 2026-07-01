import type { PlayerView } from '@domino/shared';

export function Scoreboard({ view, targetScore, myTeam }: { view: PlayerView; targetScore: number; myTeam: 'A' | 'B' | null }) {
  const scores = view.scores as { A?: number; B?: number };
  const a = scores.A ?? 0;
  const b = scores.B ?? 0;
  const us = myTeam === 'B' ? b : a;
  const them = myTeam === 'B' ? a : b;
  return (
    <div className="scorebar">
      <div className="s us">Nosotros <b>{us}</b></div>
      <div className="goal">meta {targetScore}</div>
      <div className="s">Ellos {them}</div>
    </div>
  );
}
