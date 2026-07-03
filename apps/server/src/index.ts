import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
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

  // Contexto del socket + señal de vida (revierte la cobertura por bot si aplica)
  const ctx = () => {
    const code = roomManager.getRoomCode(socket.id);
    const playerId = roomManager.getPlayerId(socket.id);
    const engine = code ? roomManager.getEngine(code) : undefined;
    if (engine && playerId) engine.markActive(playerId);
    return { code, playerId, engine };
  };

  socket.on('createRoom', (payload) => {
    roomManager.handleCreateRoom(socket, payload);
  });

  socket.on('joinRoom', (payload) => {
    roomManager.handleJoinRoom(socket, payload);
  });

  socket.on('rejoinRoom', (payload) => {
    roomManager.handleRejoinRoom(socket, payload);
  });

  socket.on('leaveRoom', () => {
    roomManager.handleLeaveRoom(socket);
  });

  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
  });

  socket.on('startGame', () => {
    const code = roomManager.getRoomCode(socket.id);
    const playerId = roomManager.getPlayerId(socket.id);
    if (code) roomManager.startGame(code, playerId);
  });

  socket.on('addBot', () => {
    roomManager.handleAddBot(socket);
  });

  socket.on('playTile', (payload) => {
    const { playerId, engine } = ctx();
    if (engine && playerId) engine.handleMove(playerId, payload);
  });

  socket.on('pass', () => {
    const { playerId, engine } = ctx();
    if (engine && playerId) engine.handlePass(playerId);
  });

  socket.on('drawTile', () => {
    const { playerId, engine } = ctx();
    if (engine && playerId) engine.handleDraw(playerId);
  });

  socket.on('requestRematch', () => {
    ctx();
    roomManager.handleRequestRematch(socket);
  });

  socket.on('sendEmote', (emoteId) => {
    const { code, playerId } = ctx();
    if (code && playerId) io.to(code).emit('emote', { playerId, emoteId });
  });

  socket.on('sendChat', (message) => {
    const { code, playerId } = ctx();
    if (code && playerId) io.to(code).emit('chat', { playerId, message: String(message).slice(0, 140) });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
