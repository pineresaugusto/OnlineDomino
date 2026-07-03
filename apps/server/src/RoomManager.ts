import { Server, Socket } from 'socket.io';
import { Room, ClientToServerEvents, ServerToClientEvents, Ruleset, Mode } from '@domino/shared';
import { GameEngine } from './GameEngine';

const DISCONNECT_BOT_MS = 60_000; // tras esto, un bot cubre al desconectado
const EMPTY_ROOM_TTL_MS = 5 * 60_000; // sala sin humanos conectados → se borra

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private socketToPlayerId: Map<string, string> = new Map(); // socket.id -> playerId
  private playerToSocket: Map<string, string> = new Map(); // playerId -> socket.id
  private gameEngines: Map<string, GameEngine> = new Map();
  private emptySince: Map<string, number> = new Map(); // code -> timestamp sin humanos online

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {
    setInterval(() => this.sweepEmptyRooms(), 60_000).unref?.();
  }

  public getRoomCode(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  public getPlayerId(socketId: string): string | undefined {
    return this.socketToPlayerId.get(socketId);
  }

  public getEngine(code: string): GameEngine | undefined {
    return this.gameEngines.get(code);
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }

  private maxSeats(mode: Mode): number {
    return mode === '1v1' ? 2 : 4;
  }

  /** Equipo del siguiente asiento: 2v2 y 1v1 alternan A/B; FFA sin equipos. */
  private teamForSeat(mode: Mode, seatIndex: number): 'A' | 'B' | null {
    if (mode === 'ffa') return null;
    return seatIndex % 2 === 0 ? 'A' : 'B';
  }

  private bindSocket(socket: Socket, code: string, playerId: string) {
    this.socketToRoom.set(socket.id, code);
    this.socketToPlayerId.set(socket.id, playerId);
    this.playerToSocket.set(playerId, socket.id);
    socket.join(code);
    socket.join(playerId);
  }

  public handleCreateRoom(socket: Socket, payload: { name: string; ruleset: Ruleset; mode: Mode; targetScore: number }) {
    const code = this.generateRoomCode();
    const hostId = `player_${Math.random().toString(36).substr(2, 9)}`;

    const newRoom: Room = {
      code,
      ruleset: payload.ruleset,
      mode: payload.mode,
      targetScore: payload.targetScore,
      status: 'lobby',
      seats: [
        { playerId: hostId, name: payload.name, team: this.teamForSeat(payload.mode, 0), connection: 'online' }
      ],
      game: null,
      hostId,
      scores: {}
    };

    this.rooms.set(code, newRoom);
    this.bindSocket(socket, code, hostId);
    socket.emit('identity', { playerId: hostId, code });
    this.emitRoomUpdate(code);
  }

  public handleJoinRoom(socket: Socket, payload: { code: string; name: string }) {
    const code = payload.code.toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      socket.emit('error', 'Sala no encontrada');
      return;
    }

    if (room.status !== 'lobby') {
      socket.emit('error', 'La partida ya empezó');
      return;
    }

    if (room.seats.length >= this.maxSeats(room.mode)) {
      socket.emit('error', 'La sala está llena');
      return;
    }

    const playerId = `player_${Math.random().toString(36).substr(2, 9)}`;
    room.seats.push({
      playerId,
      name: payload.name,
      team: this.teamForSeat(room.mode, room.seats.length),
      connection: 'online'
    });

    this.bindSocket(socket, code, playerId);
    socket.emit('identity', { playerId, code });
    this.emitRoomUpdate(code);
  }

  /** Reconexión: el cliente guardó {code, playerId} y vuelve (reload, red caída, etc.). */
  public handleRejoinRoom(socket: Socket, payload: { code: string; playerId: string }) {
    const code = (payload.code || '').toUpperCase();
    const room = this.rooms.get(code);
    const seat = room?.seats.find(s => s.playerId === payload.playerId);

    if (!room || !seat) {
      socket.emit('rejoinFailed');
      return;
    }

    // Suelta el socket viejo si sigue mapeado
    const oldSocketId = this.playerToSocket.get(payload.playerId);
    if (oldSocketId && oldSocketId !== socket.id) {
      this.socketToRoom.delete(oldSocketId);
      this.socketToPlayerId.delete(oldSocketId);
    }

    this.bindSocket(socket, code, payload.playerId);
    if (!payload.playerId.startsWith('bot_')) {
      seat.connection = 'online';
    }
    this.emptySince.delete(code);

    socket.emit('identity', { playerId: payload.playerId, code });
    this.emitRoomUpdate(code);

    const engine = this.gameEngines.get(code);
    if (room.game && engine) {
      engine.markActive(payload.playerId);
      engine.sendViewTo(payload.playerId);
    }
  }

  public handleAddBot(socket: Socket) {
    const code = this.getRoomCode(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || room.status !== 'lobby') return;
    if (room.seats.length >= this.maxSeats(room.mode)) return;

    const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
    room.seats.push({
      playerId: botId,
      name: 'Bot ' + (room.seats.length + 1),
      team: this.teamForSeat(room.mode, room.seats.length),
      connection: 'bot'
    });

    this.emitRoomUpdate(code);
  }

  public handleLeaveRoom(socket: Socket) {
    const code = this.socketToRoom.get(socket.id);
    const playerId = this.socketToPlayerId.get(socket.id);
    this.socketToRoom.delete(socket.id);
    this.socketToPlayerId.delete(socket.id);
    if (playerId) this.playerToSocket.delete(playerId);
    if (code) {
      socket.leave(code);
      if (playerId) socket.leave(playerId);
    }

    const room = code ? this.rooms.get(code) : undefined;
    if (!room || !playerId) return;

    if (room.status === 'lobby') {
      room.seats = room.seats.filter(s => s.playerId !== playerId);
      if (room.hostId === playerId) {
        const newHost = room.seats.find(s => s.playerId && !s.playerId.startsWith('bot_'));
        if (newHost?.playerId) {
          room.hostId = newHost.playerId;
        } else {
          this.destroyRoom(code!);
          return;
        }
      }
      if (room.seats.length === 0) {
        this.destroyRoom(code!);
        return;
      }
    } else {
      // En partida: lo cubre un bot para que los demás sigan jugando.
      const seat = room.seats.find(s => s.playerId === playerId);
      if (seat) seat.connection = 'bot';
    }

    this.emitRoomUpdate(code!);
    this.checkRoomEmpty(code!);
  }

  public handleDisconnect(socket: Socket) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;

    const playerId = this.socketToPlayerId.get(socket.id);
    const room = this.rooms.get(code);

    if (room && playerId) {
      const seat = room.seats.find(s => s.playerId === playerId);
      if (seat && seat.connection === 'online') {
        seat.connection = 'reconnecting';
        this.emitRoomUpdate(code);

        setTimeout(() => {
          const r = this.rooms.get(code);
          const s = r?.seats.find(st => st.playerId === playerId);
          if (s && s.connection === 'reconnecting') {
            s.connection = 'bot';
            this.emitRoomUpdate(code);
          }
        }, DISCONNECT_BOT_MS);
      }
    }

    this.socketToRoom.delete(socket.id);
    this.socketToPlayerId.delete(socket.id);
    if (playerId && this.playerToSocket.get(playerId) === socket.id) {
      this.playerToSocket.delete(playerId);
    }
    this.checkRoomEmpty(code);
  }

  private emitRoomUpdate(code: string) {
    const room = this.rooms.get(code);
    if (room) {
      const { game, ...roomWithoutGame } = room;
      this.io.to(code).emit('roomUpdate', roomWithoutGame);
    }
  }

  public startGame(code: string, requesterId?: string) {
    const room = this.rooms.get(code);
    if (!room) return;

    if (room.status === 'lobby') {
      if (requesterId && requesterId !== room.hostId) {
        this.io.to(requesterId).emit('error', 'Solo el anfitrión puede empezar');
        return;
      }
      const humans = room.seats.filter(s => s.playerId && !s.playerId.startsWith('bot_')).length;
      const needed = room.mode === 'team2v2' ? 4 : 2;
      if (room.seats.length < needed || humans < 1) {
        this.io.to(code).emit('error', 'Faltan jugadores para empezar');
        return;
      }

      let engine = this.gameEngines.get(code);
      if (!engine) {
        engine = new GameEngine(room, this.io);
        this.gameEngines.set(code, engine);
      }
      engine.startMatch();
      return;
    }

    // Revancha / siguiente mano
    const engine = this.gameEngines.get(code);
    if (!engine) return;
    if (room.status === 'handOver') {
      engine.startHand(); // conserva el marcador
    } else if (room.status === 'matchOver') {
      engine.startMatch(); // marcador a cero
    }
  }

  public handleRequestRematch(socket: Socket) {
    const code = this.getRoomCode(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || (room.status !== 'handOver' && room.status !== 'matchOver')) return;

    this.startGame(code);
  }

  private checkRoomEmpty(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    const hasOnlineHuman = room.seats.some(s =>
      s.playerId && !s.playerId.startsWith('bot_') && s.connection === 'online'
    );
    if (hasOnlineHuman) {
      this.emptySince.delete(code);
    } else if (!this.emptySince.has(code)) {
      this.emptySince.set(code, Date.now());
    }
  }

  private sweepEmptyRooms() {
    const now = Date.now();
    for (const [code, since] of this.emptySince) {
      if (now - since >= EMPTY_ROOM_TTL_MS) {
        this.destroyRoom(code);
      }
    }
    // Detecta salas que quedaron sin humanos sin pasar por disconnect/leave
    for (const code of this.rooms.keys()) {
      this.checkRoomEmpty(code);
    }
  }

  private destroyRoom(code: string) {
    const engine = this.gameEngines.get(code);
    engine?.dispose();
    this.gameEngines.delete(code);
    this.rooms.delete(code);
    this.emptySince.delete(code);
  }
}
