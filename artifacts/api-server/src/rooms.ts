/* =========================================================
   ROOM MANAGEMENT — in-memory, no persistence
   ========================================================= */

export const PLAYER_COLORS = [
  0xff2060, 0x00ffff, 0xffcc00, 0x00ff88,
  0xff8800, 0xcc66ff, 0xff44aa, 0x44ddff,
];

export interface RoomPlayer {
  id: string;
  name: string;
  skin: string;
  color: number;
  x: number;
  y: number;
  score: number;
  alive: boolean;
  isHost: boolean;
  finalScore: number;
  rank: number;
}

export interface Room {
  code: string;
  players: Map<string, RoomPlayer>;
  state: 'lobby' | 'playing' | 'results';
  colorIndex: number;
}

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(): Room {
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();
  const room: Room = { code, players: new Map(), state: 'lobby', colorIndex: 0 };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

export function addPlayerToRoom(
  room: Room,
  socketId: string,
  name: string,
  skin: string,
): RoomPlayer {
  const color = PLAYER_COLORS[room.colorIndex % PLAYER_COLORS.length];
  room.colorIndex++;
  const isHost = room.players.size === 0;
  const player: RoomPlayer = {
    id: socketId,
    name: name.slice(0, 8).trim() || 'PLAYER',
    skin,
    color,
    x: 0, y: 0, score: 0,
    alive: true,
    isHost,
    finalScore: 0,
    rank: 0,
  };
  room.players.set(socketId, player);
  return player;
}

export function removePlayerFromRoom(room: Room, socketId: string): void {
  room.players.delete(socketId);
  /* Promote the next player as host if needed */
  if (room.players.size > 0) {
    const anyAlive = [...room.players.values()].find(p => p.isHost);
    if (!anyAlive) {
      const first = room.players.values().next().value;
      if (first) first.isHost = true;
    }
  }
}

export function findRoomBySocketId(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return undefined;
}

export function playersSnapshot(room: Room) {
  return [...room.players.values()].map(p => ({
    id: p.id,
    name: p.name,
    skin: p.skin,
    color: p.color,
    x: p.x,
    y: p.y,
    score: p.score,
    alive: p.alive,
    isHost: p.isHost,
    rank: p.rank,
  }));
}
