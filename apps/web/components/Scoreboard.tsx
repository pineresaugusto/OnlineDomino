import type { PlayerView, Room } from '@domino/shared';

type RoomView = Omit<Room, 'game'>;

export function Scoreboard({ view, room, myId }: { view: PlayerView; room: RoomView; myId: string | null }) {
  const scores = view.scores ?? {};

  if (room.mode === 'ffa') {
    return (
      <div className="scorebar">
        {room.seats.filter((s) => s.playerId).map((s) => (
          <div key={s.playerId} className={`s ${s.playerId === myId ? 'us' : ''}`}>
            {s.playerId === myId ? 'Tú' : s.name} <b>{scores[s.playerId!] ?? 0}</b>
          </div>
        ))}
        <div className="goal">meta {room.targetScore}</div>
      </div>
    );
  }

  const myTeam = room.seats.find((s) => s.playerId === myId)?.team ?? 'A';
  const rivalTeam = myTeam === 'A' ? 'B' : 'A';
  const us = scores[myTeam] ?? 0;
  const them = scores[rivalTeam] ?? 0;
  const rivalLabel = room.mode === '1v1'
    ? room.seats.find((s) => s.playerId !== myId)?.name ?? 'Rival'
    : 'Ellos';
  const usLabel = room.mode === '1v1' ? 'Tú' : 'Nosotros';

  return (
    <div className="scorebar">
      <div className="s us">{usLabel} <b>{us}</b></div>
      <div className="goal">meta {room.targetScore}</div>
      <div className="s">{rivalLabel} <b>{them}</b></div>
    </div>
  );
}
