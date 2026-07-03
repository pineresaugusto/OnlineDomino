'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Mode, PlayerView, Room, Ruleset, ScoreKey, Tile } from '@domino/shared';
import { getSocket } from '@/lib/socket';

type Screen = 'onboarding' | 'menu' | 'create' | 'join' | 'lobby' | 'game';
type RoomView = Omit<Room, 'game'>;

const SESSION_KEY = 'puerca-domino-session';

interface GameResult {
  kind: 'hand' | 'match';
  winnerKey: ScoreKey | null;
  winnerName: string | null;
  points?: number;
  isBlocked?: boolean;
  scores?: Record<ScoreKey, number>;
  fullHands?: Record<string, Tile[]>;
}

interface Bubble { id: number; playerId: string; text: string; }

interface GameCtx {
  connected: boolean;
  screen: Screen;
  nick: string;
  myId: string | null;
  code: string | null;
  room: RoomView | null;
  view: PlayerView | null;
  result: GameResult | null;
  bubbles: Bubble[];
  toast: string | null;
  error: string | null;
  isMyTurn: boolean;
  turnSeconds: number; // duración del aviso de turno que manda el servidor
  nameOf: (playerId: string) => string;
  setNick: (n: string) => void;
  goto: (s: Screen) => void;
  showToast: (t: string) => void;
  createRoom: (ruleset: Ruleset, mode: Mode, targetScore: number) => void;
  joinRoom: (code: string) => void;
  practiceVsAI: () => void;
  addBot: () => void;
  startGame: () => void;
  playTile: (tile: Tile, end: 'left' | 'right') => void;
  pass: () => void;
  drawTile: () => void;
  sendEmote: (emoteId: string) => void;
  sendChat: (message: string) => void;
  rematch: () => void;
  leaveRoom: () => void;
}

const Ctx = createContext<GameCtx | null>(null);
export const useGame = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame fuera del GameProvider');
  return c;
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [nick, setNick] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [view, setView] = useState<PlayerView | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnSeconds, setTurnSeconds] = useState(60);

  const nickRef = useRef('');
  const roomRef = useRef<RoomView | null>(null);
  const autoRef = useRef(false); // modo práctica vs IA
  const bubbleId = useRef(0);
  roomRef.current = room;

  const goto = useCallback((s: Screen) => setScreen(s), []);
  const showToast = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 1600);
  }, []);

  const pushBubble = useCallback((playerId: string, text: string) => {
    const id = ++bubbleId.current;
    setBubbles((b) => [...b.slice(-3), { id, playerId, text }]);
    setTimeout(() => setBubbles((b) => b.filter((x) => x.id !== id)), 2400);
  }, []);

  const saveSession = useCallback((c: string, p: string) => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ code: c, playerId: p, nick: nickRef.current })); } catch {}
  }, []);
  const clearSession = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  // ── Wiring de eventos (una vez) ──
  useEffect(() => {
    const socket = getSocket();
    setConnected(socket.connected);

    const tryRejoin = () => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const s = JSON.parse(raw) as { code?: string; playerId?: string; nick?: string };
        if (!s.code || !s.playerId) return;
        if (s.nick) { nickRef.current = s.nick; setNick(s.nick); }
        socket.emit('rejoinRoom', { code: s.code, playerId: s.playerId });
      } catch {}
    };

    const onConnect = () => { setConnected(true); tryRejoin(); };
    const onDisconnect = () => setConnected(false);
    const onIdentity = (p: { playerId: string; code: string }) => {
      setMyId(p.playerId);
      setCode(p.code);
      saveSession(p.code, p.playerId);
      if (!autoRef.current) {
        // Si hay partida en curso llegará un gameUpdate enseguida y saltará a la mesa.
        setScreen((cur) => (cur === 'game' ? cur : 'lobby'));
      }
    };
    const onRejoinFailed = () => clearSession();
    const onRoom = (r: RoomView) => {
      setRoom(r);
      if (autoRef.current && r.status === 'lobby') {
        const socket2 = getSocket();
        const need = r.mode === 'team2v2' || r.mode === 'ffa' ? 4 : 2;
        if (r.seats.length < need) socket2.emit('addBot');
        else { socket2.emit('startGame'); autoRef.current = false; }
      }
    };
    const onGame = (v: PlayerView) => {
      setView(v);
      setResult((cur) => {
        // Al terminar la mano el servidor manda el estado final ANTES del resultado:
        // no borres un overlay ya visible; sí al empezar una mano nueva (mesa vacía).
        if (cur && v.board.length > 0) return cur;
        return null;
      });
      setScreen('game');
    };
    const onTurnTimer = (secs: number) => setTurnSeconds(secs);
    const onHandResult = (p: { winnerKey: ScoreKey | null; winnerName: string | null; points: number; isBlocked: boolean; fullHands: Record<string, Tile[]>; scores: Record<ScoreKey, number> }) =>
      setResult({ kind: 'hand', ...p });
    const onMatchResult = (p: { winnerKey: ScoreKey; winnerName: string | null; finalScores: Record<ScoreKey, number> }) =>
      setResult({ kind: 'match', winnerKey: p.winnerKey, winnerName: p.winnerName, scores: p.finalScores });
    const onEmote = (p: { playerId: string; emoteId: string }) => pushBubble(p.playerId, p.emoteId);
    const onChat = (p: { playerId: string; message: string }) => pushBubble(p.playerId, p.message);
    const onError = (msg: string) => {
      setError(msg);
      setTimeout(() => setError((cur) => (cur === msg ? null : cur)), 2600);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    socket.on('identity', onIdentity);
    socket.on('rejoinFailed', onRejoinFailed);
    socket.on('roomUpdate', onRoom);
    socket.on('gameUpdate', onGame);
    socket.on('turnTimer', onTurnTimer);
    socket.on('handResult', onHandResult);
    socket.on('matchResult', onMatchResult);
    socket.on('emote', onEmote);
    socket.on('chat', onChat);
    socket.on('error', onError);

    if (socket.connected) tryRejoin();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      socket.off('identity', onIdentity);
      socket.off('rejoinFailed', onRejoinFailed);
      socket.off('roomUpdate', onRoom);
      socket.off('gameUpdate', onGame);
      socket.off('turnTimer', onTurnTimer);
      socket.off('handResult', onHandResult);
      socket.off('matchResult', onMatchResult);
      socket.off('emote', onEmote);
      socket.off('chat', onChat);
      socket.off('error', onError);
    };
  }, [pushBubble, saveSession, clearSession]);

  const updateNick = useCallback((n: string) => {
    nickRef.current = n;
    setNick(n);
  }, []);

  const createRoom = useCallback((ruleset: Ruleset, mode: Mode, targetScore: number) => {
    getSocket().emit('createRoom', { name: nickRef.current || 'Jugador', ruleset, mode, targetScore });
  }, []);
  const joinRoom = useCallback((c: string) => {
    getSocket().emit('joinRoom', { code: c.trim().toUpperCase(), name: nickRef.current || 'Jugador' });
  }, []);
  const practiceVsAI = useCallback(() => {
    autoRef.current = true;
    getSocket().emit('createRoom', { name: nickRef.current || 'Jugador', ruleset: 'block', mode: '1v1', targetScore: 100 });
  }, []);
  const addBot = useCallback(() => getSocket().emit('addBot'), []);
  const startGame = useCallback(() => getSocket().emit('startGame'), []);
  const playTile = useCallback((tile: Tile, end: 'left' | 'right') => getSocket().emit('playTile', { tile, end }), []);
  const pass = useCallback(() => getSocket().emit('pass'), []);
  const drawTile = useCallback(() => getSocket().emit('drawTile'), []);
  const sendEmote = useCallback((emoteId: string) => getSocket().emit('sendEmote', emoteId), []);
  const sendChat = useCallback((message: string) => getSocket().emit('sendChat', message), []);
  const rematch = useCallback(() => { setResult(null); getSocket().emit('requestRematch'); }, []);
  const leaveRoom = useCallback(() => {
    getSocket().emit('leaveRoom');
    clearSession();
    setRoom(null); setView(null); setResult(null); autoRef.current = false;
    setScreen('menu');
  }, [clearSession]);

  const nameOf = useCallback((playerId: string) => {
    const seat = roomRef.current?.seats.find((s) => s.playerId === playerId);
    return seat?.name ?? 'Jugador';
  }, []);

  const isMyTurn = !!(view && myId && view.turn === myId);

  const value: GameCtx = {
    connected, screen, nick, myId, code, room, view, result, bubbles, toast, error, isMyTurn, turnSeconds,
    nameOf, setNick: updateNick, goto, showToast,
    createRoom, joinRoom, practiceVsAI, addBot, startGame, playTile, pass, drawTile, sendEmote, sendChat, rematch, leaveRoom,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
