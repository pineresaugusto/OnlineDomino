import { Server, Socket } from 'socket.io';
import { Room, ClientToServerEvents, ServerToClientEvents, Ruleset, Mode, Seat, PlayerView } from '@domino/shared';
import { GameEngine } from './GameEngine';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private socketToPlayerId: Map<string, string> = new Map(); // socket.id -> playerId
  private gameEngines: Map<string, GameEngine> = new Map();

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {}

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

  public handleCreateRoom(socket: Socket, payload: { name: string; ruleset: Ruleset; mode: Mode; targetScore: number }) {
    const code = this.generateRoomCode();
    const hostId = `player_${Math.random().toString(36).substr(2, 9)}`; // simple id generation for now

    const newRoom: Room = {
      code,
      ruleset: payload.ruleset,
      mode: payload.mode,
      targetScore: payload.targetScore,
      status: 'lobby',
      seats: [
        { playerId: hostId, name: payload.name, team: 'A', connection: 'online' }
      ],
      game: null,
      hostId
    };

    this.rooms.set(code, newRoom);
    this.socketToRoom.set(socket.id, code);
    this.socketToPlayerId.set(socket.id, hostId);
    
    socket.join(code);
    socket.join(hostId);
    this.emitRoomUpdate(code);
  }

  public handleJoinRoom(socket: Socket, payload: { code: string; name: string }) {
    const code = payload.code.toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.status !== 'lobby') {
      socket.emit('error', 'Game already started');
      return;
    }

    // Determine team or seat
    const maxSeats = room.mode === 'team2v2' || room.mode === 'ffa' ? 4 : 2;
    if (room.seats.length >= maxSeats) {
      socket.emit('error', 'Room is full');
      return;
    }

    const playerId = `player_${Math.random().toString(36).substr(2, 9)}`;
    const team = room.mode === 'team2v2' ? (room.seats.length % 2 === 0 ? 'A' : 'B') : null;
    
    room.seats.push({
      playerId,
      name: payload.name,
      team,
      connection: 'online'
    });

    this.socketToRoom.set(socket.id, code);
    this.socketToPlayerId.set(socket.id, playerId);
    
    socket.join(code);
    socket.join(playerId);
    this.emitRoomUpdate(code);
  }

  public handleAddBot(socket: Socket) {
    const code = this.getRoomCode(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || room.status !== 'lobby') return;

    const maxSeats = room.mode === 'team2v2' || room.mode === 'ffa' ? 4 : 2;
    if (room.seats.length >= maxSeats) return;

    const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
    const team = room.mode === 'team2v2' ? (room.seats.length % 2 === 0 ? 'A' : 'B') : null;
    
    room.seats.push({
      playerId: botId,
      name: 'Bot ' + (room.seats.length + 1),
      team,
      connection: 'bot'
    });

    this.emitRoomUpdate(code);
  }

  public handleDisconnect(socket: Socket) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    
    const playerId = this.socketToPlayerId.get(socket.id);
    const room = this.rooms.get(code);
    
    if (room && playerId) {
      const seat = room.seats.find(s => s.playerId === playerId);
      if (seat) {
        seat.connection = 'reconnecting';
        this.emitRoomUpdate(code);

        // Disconnect timeout: replace with bot after 60 seconds
        setTimeout(() => {
          const s = room.seats.find(st => st.playerId === playerId);
          if (s && s.connection === 'reconnecting') {
            s.connection = 'bot';
            this.emitRoomUpdate(code);
          }
        }, 60000);
      }
    }
    
    this.socketToRoom.delete(socket.id);
    this.socketToPlayerId.delete(socket.id);
  }

  private emitRoomUpdate(code: string) {
    const room = this.rooms.get(code);
    if (room) {
      const { game, ...roomWithoutGame } = room;
      this.io.to(code).emit('roomUpdate', roomWithoutGame);
    }
  }

  // To be called when game starts
  public startGame(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    
    room.status = 'playing';
    const engine = new GameEngine(room, this.io);
    this.gameEngines.set(code, engine);
    engine.start();
  }

  public handleRequestRematch(socket: Socket) {
    const code = this.getRoomCode(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || room.status !== 'handOver') return;

    this.startGame(code);
  }
}
