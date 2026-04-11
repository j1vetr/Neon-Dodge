
/* =========================================================
   GAME CONSTANTS
   Central config for all tunable game values
   ========================================================= */

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

/* Player */
export const PLAYER_SIZE = 18;
export const PLAYER_HORIZONTAL_SPEED = 160;
export const PLAYER_START_X = GAME_WIDTH / 2;
export const PLAYER_START_Y = GAME_HEIGHT * 0.75;

/* World scroll speed (increases over time) */
export const BASE_SCROLL_SPEED = 220;
export const SCROLL_SPEED_INCREMENT = 12; // added per second
export const MAX_SCROLL_SPEED = 600;

/* Obstacle */
export const OBSTACLE_SPAWN_INTERVAL_MS = 1200; // ms between spawns (decreases)
export const OBSTACLE_SPAWN_MIN_MS = 500;
export const OBSTACLE_LANE_WIDTH = 80;
export const OBSTACLE_THICKNESS = 18;
export const GAP_MIN = 90;
export const GAP_MAX = 160;

/* Laser */
export const LASER_THICKNESS = 6;
export const LASER_WARN_DURATION = 800; // ms

/* Particles */
export const TRAIL_PARTICLE_LIFETIME = 350;
export const TRAIL_EMIT_INTERVAL = 35; // ms

/* Slow-motion */
export const SLOWMO_PROXIMITY = 55; // px distance to trigger slow-mo
export const SLOWMO_TIMESCALE = 0.28;

/* Screen shake */
export const SHAKE_DURATION = 350;
export const SHAKE_INTENSITY = 0.015;

/* Colors */
export const COLOR_BG = 0x050510;
export const COLOR_PLAYER = 0x00ffff;
export const COLOR_WALL = 0xff2060;
export const COLOR_LASER = 0xffff00;
export const COLOR_GAP_INDICATOR = 0x00ff88;
export const COLOR_SCORE = 0xffffff;
export const COLOR_TRAIL = 0x00ffff;

export const HEX_PLAYER = '#00ffff';
export const HEX_WALL = '#ff2060';
export const HEX_LASER = '#ffff00';
export const HEX_TRAIL = '#00ffff';
export const HEX_GAP = '#00ff88';

/* Skins — player colours */
export const SKINS = [
  { name: 'Cyan',    color: 0x00ffff, hex: '#00ffff' },
  { name: 'Magenta', color: 0xff00ff, hex: '#ff00ff' },
  { name: 'Lime',    color: 0x00ff44, hex: '#00ff44' },
  { name: 'Gold',    color: 0xffcc00, hex: '#ffcc00' },
  { name: 'White',   color: 0xffffff, hex: '#ffffff' },
];

export const STORAGE_HIGHSCORE = 'neonDodge_highScore';
export const STORAGE_SKIN      = 'neonDodge_skin';
