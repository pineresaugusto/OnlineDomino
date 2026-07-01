import { Server } from 'socket.io';
import { Room, GameState, PlayerView, dealTiles, whoStarts, applyMove, legalMoves, isBlocked, scoreHand, ClientToServerEvents, ServerToClientEvents, Tile } from '@domino/shared';

export class GameEngine {
  private turnTimerId: NodeJS.Timeout | null = null;
  private afkCounters: Record<string, number> = {};

  constructor(
    private room: Room,
    private io: Server<ClientToServerEvents, ServerToClientEvents>
  ) {}

  public start() {
    const playerIds = this.room.seats.map(s => s.playerId!);
    const { hands, boneyard } = dealTiles(playerIds, this.room.ruleset);
    
    const turn = whoStarts(hands);

    this.room.game = {
      boneyard,
      board: [],
      hands,
      turn,
      passesInARow: 0,
      scores: { A: 0, B: 0 },
      openEnds: null,
      isFirstTurn: true
    };

    playerIds.forEach(id => this.afkCounters[id] = 0);

    this.broadcastGameUpdate();
    this.startTurnTimer();
  }

  public handleMove(playerId: string, move: { tile: Tile, end: 'left' | 'right' | 'any' }) {
    if (!this.room.game) return;
    if (this.room.game.turn !== playerId) return; // not their turn

    const view = this.generatePlayerView(playerId);
    const validMoves = legalMoves(view);
    
    // Simple validation (can be more rigorous)
    const isValid = validMoves.some(m => m.tile[0] === move.tile[0] && m.tile[1] === move.tile[1] && (m.end === 'any' || m.end === move.end));
    
    if (isValid) {
      this.room.game = applyMove(this.room.game, move, playerId);
      
      // Check for win
      if (this.room.game.hands[playerId].length === 0) {
        this.handleHandEnd(playerId); // they won
      } else if (isBlocked(this.room.game)) {
        this.handleHandEnd(null); // blocked
      } else {
        this.nextTurn();
      }
    }
  }

  public handlePass(playerId: string) {
    if (!this.room.game) return;
    if (this.room.game.turn !== playerId) return;

    this.room.game.passesInARow++;
    if (isBlocked(this.room.game)) {
      this.handleHandEnd(null);
    } else {
      this.nextTurn();
    }
  }

  private startTurnTimer() {
    if (this.turnTimerId) clearTimeout(this.turnTimerId);
    if (!this.room.game) return;

    // Emit timer start
    this.io.to(this.room.code).emit('turnTimer', 15);

    this.turnTimerId = setTimeout(() => {
      if (!this.room.game) return;
      const turn = this.room.game.turn;
      
      // AFK timeout triggered
      this.afkCounters[turn] = (this.afkCounters[turn] || 0) + 1;
      
      // Convert to bot if 3 consecutive AFKs
      if (this.afkCounters[turn] >= 3) {
        const seat = this.room.seats.find(s => s.playerId === turn);
        if (seat) seat.connection = 'bot';
      }

      // Force a pass or bot move
      const seat = this.room.seats.find(s => s.playerId === turn);
      if (seat && (seat.connection === 'bot' || seat.connection === 'reconnecting')) {
        this.playBotMove(turn);
      } else {
        this.handlePass(turn);
      }
    }, 15000);
  }

  private nextTurn() {
    if (!this.room.game) return;
    const playerIds = this.room.seats.map(s => s.playerId!);
    const currentIndex = playerIds.indexOf(this.room.game.turn);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextPlayerId = playerIds[nextIndex];
    this.room.game.turn = nextPlayerId;
    this.broadcastGameUpdate();
    this.startTurnTimer();

    const nextSeat = this.room.seats.find(s => s.playerId === nextPlayerId);
    if (nextSeat && (nextSeat.connection === 'bot' || nextSeat.connection === 'reconnecting')) {
      if (this.turnTimerId) clearTimeout(this.turnTimerId);
      setTimeout(() => this.playBotMove(nextPlayerId), 1500);
    }
  }

  private playBotMove(playerId: string) {
    if (!this.room.game || this.room.game.turn !== playerId) return;
    const view = this.generatePlayerView(playerId);
    const validMoves = legalMoves(view);

    if (validMoves.length > 0) {
      // Simple AI: play highest weight tile
      validMoves.sort((a, b) => (b.tile[0] + b.tile[1]) - (a.tile[0] + a.tile[1]));
      this.handleMove(playerId, validMoves[0]);
    } else {
      this.handlePass(playerId);
    }
  }

  private handleHandEnd(winnerId: string | null) {
    if (this.turnTimerId) clearTimeout(this.turnTimerId);
    if (!this.room.game) return;
    this.room.status = 'handOver';
    
    // Team Map
    const teamMap: Record<string, 'A' | 'B'> = {};
    this.room.seats.forEach(s => {
      if (s.playerId && s.team) teamMap[s.playerId] = s.team;
    });

    const scoreResult = scoreHand(this.room.game, this.room.ruleset, winnerId, teamMap);

    const fullHands = this.room.game.hands;
    this.io.to(this.room.code).emit('handResult', {
      winnerTeam: scoreResult.winnerTeam,
      points: scoreResult.points,
      isBlocked: scoreResult.isBlocked,
      fullHands
    });
  }

  private broadcastGameUpdate() {
    if (!this.room.game) return;

    // Send filtered state to each player
    this.room.seats.forEach(seat => {
      if (!seat.playerId) return;
      // We would ideally map socketId to playerId to send specifically to them.
      // A common pattern is having players join a specific room for themselves.
      // For now, we will emit a general event, but in a real app, send to specific socket.
      // Let's assume we send to a room named after their playerId.
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
      scores: game.scores,
      openEnds: game.openEnds,
      isFirstTurn: game.isFirstTurn
    };
  }
}
