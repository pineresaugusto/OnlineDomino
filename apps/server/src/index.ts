// ── Servidor autoritativo (esqueleto Fase 0) ──
// La lógica real de salas/juego llega en las fases B2–B4.
import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@domino/shared';

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';

// Healthcheck HTTP simple (útil para el deploy en Railway/Render).
const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, service: 'domino-server' }));
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

type DominoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

io.on('connection', (socket: DominoSocket) => {
  console.log('→ cliente conectado:', socket.id);

  // TODO Fase B2: crear sala real con código único y RoomManager.
  socket.on('createRoom', (payload, cb) => {
    console.log('createRoom (stub):', payload);
    cb({ code: 'DEMO', playerId: socket.id });
  });

  // TODO Fase B2: unir a sala existente por código.
  socket.on('joinRoom', (payload, cb) => {
    console.log('joinRoom (stub):', payload);
    cb({ ok: false, error: 'No implementado en Fase 0' });
  });

  socket.on('disconnect', () => {
    console.log('← cliente salió:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🁡 Servidor dominó en http://localhost:${PORT}`);
  console.log(`   CORS permitido para: ${CLIENT_ORIGIN}`);
});
