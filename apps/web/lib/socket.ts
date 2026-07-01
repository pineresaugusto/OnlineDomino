import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@domino/shared';

export type DominoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: DominoSocket | null = null;

/** Singleton del socket tipado (solo en cliente). */
export function getSocket(): DominoSocket {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
  }
  return socket;
}
