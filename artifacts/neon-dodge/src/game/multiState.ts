/* =========================================================
   MULTIPLAYER STATE  —  singleton socket bağlantısı + oda durumu
   ========================================================= */

import { io, Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';

export interface NetPlayer {
  id: string;
  name: string;
  skin: string;
  color: number;
  x: number;
  y: number;
  score: number;
  alive: boolean;
  isHost: boolean;
  rank: number;
}

export interface GameResult {
  id: string;
  name: string;
  skin: string;
  color: number;
  score: number;
  rank: number;
}

const PROD_SERVER = 'https://neon.toov.com.tr';

function getSocketUrl(): string {
  if (Capacitor.isNativePlatform()) return PROD_SERVER;
  return window.location.origin;
}

const SOCKET_PATH = '/api/socket.io';

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket || _socket.disconnected) {
    _socket = io(getSocketUrl(), {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 8000,
    });
  }
  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

/* Paylaşılan oda state'i */
export const roomState = {
  code: '',
  myId: '',
  myColor: 0x00ffff,
  players: new Map<string, NetPlayer>(),
  results: [] as GameResult[],
};

export function colorHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export const SKIN_KEYS = ['skin-klasik', 'skin-nasa', 'skin-turk', 'skin-orman'] as const;
export type SkinKey = typeof SKIN_KEYS[number];

/* pos güncelleme throttle */
let _lastPosSend = 0;
export function sendPosThrottled(x: number, y: number, score: number): void {
  const now = Date.now();
  if (now - _lastPosSend < 80) return;
  _lastPosSend = now;
  getSocket().emit('pos-update', { x, y, score });
}
