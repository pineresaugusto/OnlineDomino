'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { createDoubleSixSet, type ClientToServerEvents, type ServerToClientEvents } from '@domino/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

type Estado = 'conectando' | 'conectado' | 'sin conexión';

export default function Home() {
  const [estado, setEstado] = useState<Estado>('conectando');
  const totalFichas = createDoubleSixSet().length;

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    socket.on('connect', () => setEstado('conectado'));
    socket.on('disconnect', () => setEstado('sin conexión'));
    socket.on('connect_error', () => setEstado('sin conexión'));
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold">🁡 Dominó Online</h1>
      <p className="opacity-80">
        Andamiaje Fase 0 — el set doble-6 tiene {totalFichas} fichas.
      </p>
      <span
        className="rounded-full px-4 py-1 text-sm font-medium"
        style={{ backgroundColor: estado === 'conectado' ? '#1f8a4c' : '#8a1f1f' }}
      >
        Servidor: {estado}
      </span>
      <p className="max-w-sm text-xs opacity-60">
        (Levanta el servidor con <code>pnpm dev:server</code> para ver el estado en verde.)
      </p>
    </main>
  );
}
