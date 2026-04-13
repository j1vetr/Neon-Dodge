/* =========================================================
   SOCKET.IO EVENT HANDLERS
   ========================================================= */

import type { Server, Socket } from 'socket.io';
import {
  createRoom, getRoom, deleteRoom, addPlayerToRoom,
  removePlayerFromRoom, findRoomBySocketId, playersSnapshot,
} from './rooms.js';
import { logger } from './lib/logger.js';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    logger.info({ id: socket.id }, 'socket connected');

    /* ── Oda oluştur ── */
    socket.on('create-room', ({ name, skin }: { name: string; skin: string }) => {
      const room = createRoom();
      const player = addPlayerToRoom(room, socket.id, name, skin);
      socket.join(room.code);
      socket.emit('room-created', {
        code: room.code,
        myId: socket.id,
        players: playersSnapshot(room),
        myColor: player.color,
      });
    });

    /* ── Odaya gir ── */
    socket.on('join-room', ({ code, name, skin }: { code: string; name: string; skin: string }) => {
      const upper = code.toUpperCase().trim();
      const room = getRoom(upper);
      if (!room) {
        socket.emit('room-error', { msg: 'Oda bulunamadı' });
        return;
      }
      if (room.state !== 'lobby') {
        socket.emit('room-error', { msg: 'Oyun zaten başladı' });
        return;
      }
      if (room.players.size >= 8) {
        socket.emit('room-error', { msg: 'Oda dolu (maks 8)' });
        return;
      }
      const player = addPlayerToRoom(room, socket.id, name, skin);
      socket.join(upper);
      socket.emit('room-joined', {
        code: upper,
        myId: socket.id,
        players: playersSnapshot(room),
        myColor: player.color,
      });
      socket.to(upper).emit('player-joined', {
        id: socket.id,
        name: player.name,
        skin: player.skin,
        color: player.color,
        isHost: false,
        alive: true,
      });
    });

    /* ── Oyunu başlat (sadece host) ── */
    socket.on('start-game', () => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player?.isHost) return;
      if (room.players.size < 1) return;
      room.state = 'playing';
      for (const p of room.players.values()) {
        p.alive = true;
        p.score = 0;
        p.x = 0;
        p.y = 0;
        p.finalScore = 0;
        p.rank = 0;
      }
      io.to(room.code).emit('game-starting', {
        players: playersSnapshot(room),
      });
    });

    /* ── Pozisyon güncelle ── */
    socket.on('pos-update', ({ x, y, score }: { x: number; y: number; score: number }) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || room.state !== 'playing') return;
      const player = room.players.get(socket.id);
      if (!player) return;
      player.x = x;
      player.y = y;
      player.score = score;
      /* Broadcast sadece diğerlerine */
      socket.to(room.code).emit('player-pos', { id: socket.id, x, y, score });
    });

    /* ── Oyuncu öldü ── */
    socket.on('player-dead', ({ score }: { score: number }) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || room.state !== 'playing') return;
      const player = room.players.get(socket.id);
      if (!player || !player.alive) return;
      player.alive = false;
      player.finalScore = score;
      io.to(room.code).emit('player-died', { id: socket.id, score });

      /* Hepsi öldü mü? */
      const alive = [...room.players.values()].filter(p => p.alive);
      if (alive.length === 0) {
        _finishGame(io, room);
      }
    });

    /* ── Lobiye geri dön ── */
    socket.on('return-to-lobby', () => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;
      room.state = 'lobby';
      for (const p of room.players.values()) {
        p.alive = true;
        p.score = 0;
        p.finalScore = 0;
        p.rank = 0;
      }
      io.to(room.code).emit('lobby-reset', {
        players: playersSnapshot(room),
      });
    });

    /* ── Bağlantı kesildi ── */
    socket.on('disconnect', () => {
      logger.info({ id: socket.id }, 'socket disconnected');
      const room = findRoomBySocketId(socket.id);
      if (!room) return;
      removePlayerFromRoom(room, socket.id);
      io.to(room.code).emit('player-left', { id: socket.id });

      if (room.players.size === 0) {
        deleteRoom(room.code);
        return;
      }
      /* Oyun sırasında herkes öldüyse kontrol et */
      if (room.state === 'playing') {
        const alive = [...room.players.values()].filter(p => p.alive);
        if (alive.length === 0) _finishGame(io, room);
      }
    });
  });
}

function _finishGame(io: Server, room: ReturnType<typeof getRoom>): void {
  if (!room) return;
  room.state = 'results';
  const sorted = [...room.players.values()]
    .sort((a, b) => b.finalScore - a.finalScore);
  sorted.forEach((p, i) => { p.rank = i + 1; });

  io.to(room.code).emit('game-over', {
    results: sorted.map(p => ({
      id: p.id,
      name: p.name,
      skin: p.skin,
      color: p.color,
      score: p.finalScore,
      rank: p.rank,
    })),
  });
}
