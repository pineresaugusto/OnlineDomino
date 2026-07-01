import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@domino/shared';
import { RoomManager } from './RoomManager';

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*', // For v1 we can restrict this later
    methods: ['GET', 'POST']
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  // Basic connection event bindings would go here and inside RoomManager
  // Since we rely on player IDs to be sent, we will assume joining a room provides it.
  
  socket.on('createRoom', (payload) => {
    roomManager.handleCreateRoom(socket, payload);
  });

  socket.on('joinRoom', (payload) => {
    roomManager.handleJoinRoom(socket, payload);
  });

  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
  });

  socket.on('startGame', () => {
    const code = roomManager.getRoomCode(socket.id);
    if (code) roomManager.startGame(code);
  });

  socket.on('addBot', () => {
    roomManager.handleAddBot(socket);
  });

  socket.on('playTile', (payload) => {
    const code = roomManager.getRoomCode(socket.id);
    const playerId = roomManager.getPlayerId(socket.id);
    if (code && playerId) {
      const engine = roomManager.getEngine(code);
      if (engine) engine.handleMove(playerId, payload);
    }
  });

  socket.on('pass', () => {
    const code = roomManager.getRoomCode(socket.id);
    const playerId = roomManager.getPlayerId(socket.id);
    if (code && playerId) {
      const engine = roomManager.getEngine(code);
      if (engine) engine.handlePass(playerId);
    }
  });

  socket.on('requestRematch', () => {
    roomManager.handleRequestRematch(socket);
  });

  socket.on('sendEmote', (emoteId) => {
    const code = roomManager.getRoomCode(socket.id);
    const playerId = roomManager.getPlayerId(socket.id);
    if (code && playerId) io.to(code).emit('emote', { playerId, emoteId });
  });

  socket.on('sendChat', (message) => {
    const code = roomManager.getRoomCode(socket.id);
    const playerId = roomManager.getPlayerId(socket.id);
    if (code && playerId) io.to(code).emit('chat', { playerId, message });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
