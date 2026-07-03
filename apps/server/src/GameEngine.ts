import { Server } from 'socket.io';
import {
  Room, PlayerView, dealTiles, whoStarts, applyMove, legalMoves, isBlocked, scoreHand,
  mustDraw, ClientToServerEvents, ServerToClientEvents, Tile, ScoreKey
} from '@domino/shared';

const HUMAN_TURN_SECONDS = 60; // aviso; a la 2ª expiración lo cubre un bot
const BOT_MOVE_DELAY_MS = 1200;

export class GameEngine {
  private turnTimerId: NodeJS.Timeout | null = null;
  private botMoveTimerId: NodeJS.Timeout | null = null;
  private afkCounters: Record<string, number> = {};
  private lastHandWinnerId: string | null = null;
  private disposed = false;

  constructor(
    private room: Room,
    private io: Server<ClientToServerEvents, ServerToClientEvents>
  ) {}

  /** Clave de puntuación de un jugador: equipo en 2v2/1v1, playerId en FFA. */
  private keyOf(playerId: string): ScoreKey {
    const seat = this.room.seats.find(s => s.playerId === playerId);
    return (this.room.mode === 'ffa' ? playerId : seat?.team) ?? playerId;
  }

  private keyMap(): Record<string, ScoreKey> {
    const map: Record<string, ScoreKey> = {};
    this.room.seats.forEach(s => { if (s.playerId) map[s.playerId] = this.keyOf(s.playerId); });
    return map;
  }

  private nameOfKey(key: ScoreKey | null): string | null {
    if (!key) return null;
    if (this.room.mode === 'ffa' || key.startsWith('player_') || key.startsWith('bot_')) {
      return this.room.seats.find(s => s.playerId === key)?.name ?? null;
    }
    const members = this.room.seats.filter(s => s.team === key).map(s => s.name);
    return members.join(' y ') || null;
  }

  /** Empieza una partida desde cero (marcador a 0). */
  public startMatch() {
    this.room.scores = {};
    this.room.seats.forEach(s => {
      if (s.playerId) this.room.scores[this.keyOf(s.playerId)] = 0;
    });
    this.lastHandWinnerId = null;
    this.startHand();
  }

  /** Reparte la siguiente mano conservando el marcador. */
  public startHand() {
    this.clearTimers();
    const playerIds = this.room.seats.map(s => s.playerId!).filter(Boolean);
    const { hands, boneyard } = dealTiles(playerIds, this.room.ruleset);

    // Sale el ganador de la mano anterior; en la primera, el doble más alto (forzado).
    let turn: string;
    let opener: Tile | null = null;
    if (this.lastHandWinnerId && hands[this.lastHandWinnerId]) {
      turn = this.lastHandWinnerId;
    } else {
      const s = whoStarts(hands);
      turn = s.starter;
      opener = s.opener;
    }

    this.room.status = 'playing';
    this.room.game = {
      boneyard,
      board: [],
      hands,
      turn,
      passesInARow: 0,
      openEnds: null,
      isFirstTurn: true,
      requiredOpener: opener
    };

    playerIds.forEach(id => this.afkCounters[id] = 0);

    this.emitRoomUpdate();
    this.broadcastGameUpdate();
    this.scheduleTurn();
  }

  public dispose() {
    this.disposed = true;
    this.clearTimers();
  }

  private clearTimers() {
    if (this.turnTimerId) { clearTimeout(this.turnTimerId); this.turnTimerId = null; }
    if (this.botMoveTimerId) { clearTimeout(this.botMoveTimerId); this.botMoveTimerId = null; }
  }

  /** El jugador dio señales de vida: si estaba cubierto por bot, recupera el control. */
  public markActive(playerId: string) {
    this.afkCounters[playerId] = 0;
    const seat = this.room.seats.find(s => s.playerId === playerId);
    if (seat && seat.connection === 'bot' && !playerId.startsWith('bot_')) {
      seat.connection = 'online';
      this.io.to(this.room.code).emit('playerConnection', { playerId, status: 'online' });
    }
  }

  public handleMove(playerId: string, move: { tile: Tile, end: 'left' | 'right' | 'any' }): boolean {
    if (!this.room.game || this.room.status !== 'playing') return false;
    if (this.room.game.turn !== playerId) return false;

    const view = this.generatePlayerView(playerId);
    const validMoves = legalMoves(view);
    const isValid = validMoves.some(m =>
      ((m.tile[0] === move.tile[0] && m.tile[1] === move.tile[1]) || (m.tile[0] === move.tile[1] && m.tile[1] === move.tile[0]))
      && (m.end === 'any' || m.end === move.end)
    );
    if (!isValid) return false;

    this.room.game = applyMove(this.room.game, move, playerId);

    if (this.room.game.hands[playerId].length === 0) {
      this.handleHandEnd(playerId); // dominó
    } else {
      this.nextTurn();
    }
    return true;
  }

  public handlePass(playerId: string): boolean {
    if (!this.room.game || this.room.status !== 'playing') return false;
    if (this.room.game.turn !== playerId) return false;

    // Pasar solo es legal sin jugadas posibles (y en "robar", con el pozo vacío).
    const view = this.generatePlayerView(playerId);
    if (legalMoves(view).length > 0 || mustDraw(view, this.room.ruleset)) {
      this.io.to(playerId).emit('error', 'Tienes jugada — no puedes pasar');
      return false;
    }

    this.room.game.passesInARow++;
    if (isBlocked(this.room.game)) {
      this.handleHandEnd(null);
    } else {
      this.nextTurn();
    }
    return true;
  }

  public handleDraw(playerId: string): boolean {
    if (!this.room.game || this.room.status !== 'playing') return false;
    if (this.room.game.turn !== playerId) return false;

    const view = this.generatePlayerView(playerId);
    if (!mustDraw(view, this.room.ruleset)) {
      this.io.to(playerId).emit('error', 'No puedes robar ahora');
      return false;
    }

    const tile = this.room.game.boneyard.pop()!;
    this.room.game.hands[playerId] = [...this.room.game.hands[playerId], tile];
    this.broadcastGameUpdate();
    this.scheduleTurn(); // sigue su turno: reintenta jugar (o roba de nuevo)
    return true;
  }

  /** Programa lo que toque para el turno actual (timer humano o jugada de bot). */
  private scheduleTurn() {
    this.clearTimers();
    if (!this.room.game || this.room.status !== 'playing') return;

    const turn = this.room.game.turn;
    const seat = this.room.seats.find(s => s.playerId === turn);

    if (seat && (seat.connection === 'bot' || seat.connection === 'reconnecting')) {
      this.botMoveTimerId = setTimeout(() => this.playBotMove(turn), BOT_MOVE_DELAY_MS);
      return;
    }

    // Humano conectado: cuenta regresiva que avisa; si expira dos veces, lo cubre el bot.
    this.io.to(this.room.code).emit('turnTimer', HUMAN_TURN_SECONDS);
    this.turnTimerId = setTimeout(() => {
      if (this.disposed || !this.room.game || this.room.status !== 'playing') return;
      if (this.room.game.turn !== turn) return;

      this.afkCounters[turn] = (this.afkCounters[turn] || 0) + 1;
      if (this.afkCounters[turn] >= 2) {
        const s = this.room.seats.find(st => st.playerId === turn);
        if (s) {
          s.connection = 'bot';
          this.io.to(this.room.code).emit('playerConnection', { playerId: turn, status: 'bot' });
        }
        this.playBotMove(turn);
      } else {
        // Primera expiración: reinicia el aviso y dale otra ronda.
        this.scheduleTurn();
      }
    }, HUMAN_TURN_SECONDS * 1000);
  }

  private nextTurn() {
    if (!this.room.game) return;
    const playerIds = this.room.seats.map(s => s.playerId!).filter(Boolean);
    const currentIndex = playerIds.indexOf(this.room.game.turn);
    this.room.game.turn = playerIds[(currentIndex + 1) % playerIds.length];
    this.broadcastGameUpdate();
    this.scheduleTurn();
  }

  private playBotMove(playerId: string) {
    if (this.disposed || !this.room.game || this.room.status !== 'playing') return;
    if (this.room.game.turn !== playerId) return;

    // Si el humano recuperó el control, devuélvele el turno con timer normal.
    const seat = this.room.seats.find(s => s.playerId === playerId);
    if (seat && seat.connection === 'online') {
      this.scheduleTurn();
      return;
    }

    const view = this.generatePlayerView(playerId);

    if (mustDraw(view, this.room.ruleset)) {
      this.handleDraw(playerId);
      return; // scheduleTurn reintenta con delay de bot
    }

    const validMoves = legalMoves(view);
    if (validMoves.length > 0) {
      // IA simple: suelta la ficha más pesada
      validMoves.sort((a, b) => (b.tile[0] + b.tile[1]) - (a.tile[0] + a.tile[1]));
      this.handleMove(playerId, validMoves[0]);
    } else {
      this.handlePass(playerId);
    }
  }

  private handleHandEnd(winnerId: string | null) {
    this.clearTimers();
    if (!this.room.game) return;

    const result = scoreHand(this.room.game, this.room.ruleset, winnerId, this.keyMap());

    if (result.winnerKey) {
      this.room.scores[result.winnerKey] = (this.room.scores[result.winnerKey] ?? 0) + result.points;
      this.lastHandWinnerId = result.winnerId;
    }

    // Que todos vean la última jugada / manos congeladas antes del overlay.
    this.broadcastGameUpdate();

    const matchWon = result.winnerKey && (this.room.scores[result.winnerKey] ?? 0) >= this.room.targetScore;
    this.room.status = matchWon ? 'matchOver' : 'handOver';
    this.emitRoomUpdate();

    this.io.to(this.room.code).emit('handResult', {
      winnerKey: result.winnerKey,
      winnerName: this.nameOfKey(result.winnerKey),
      points: result.points,
      isBlocked: result.isBlocked,
      fullHands: this.room.game.hands,
      scores: { ...this.room.scores }
    });

    if (matchWon) {
      this.io.to(this.room.code).emit('matchResult', {
        winnerKey: result.winnerKey!,
        winnerName: this.nameOfKey(result.winnerKey),
        finalScores: { ...this.room.scores }
      });
    }
  }

  private emitRoomUpdate() {
    const { game, ...roomWithoutGame } = this.room;
    this.io.to(this.room.code).emit('roomUpdate', roomWithoutGame);
  }

  /** Reenvía la vista actual a un jugador (reconexión). */
  public sendViewTo(playerId: string) {
    if (!this.room.game) return;
    this.io.to(playerId).emit('gameUpdate', this.generatePlayerView(playerId));
  }

  private broadcastGameUpdate() {
    if (!this.room.game) return;
    this.room.seats.forEach(seat => {
      if (!seat.playerId || seat.playerId.startsWith('bot_')) return;
      const view = this.generatePlayerView(seat.playerId);
      this.io.to(seat.playerId).emit('gameUpdate', view);
    });
  }

  private generatePlayerView(playerId: string): PlayerView {
    const game = this.room.game!;
    const opponentHands: Record<string, number> = {};
    for (const [id, hand] of Object.entries(game.hands)) {
      if (id !== playerId) {
        opponentHands[id] = hand.length;
      }
    }

    return {
      boneyardCount: game.boneyard.length,
      board: game.board,
      myHand: game.hands[playerId] || [],
      opponentHands,
      turn: game.turn,
      passesInARow: game.passesInARow,
      scores: { ...this.room.scores },
      openEnds: game.openEnds,
      isFirstTurn: game.isFirstTurn,
      requiredOpener: game.requiredOpener
    };
  }
}
