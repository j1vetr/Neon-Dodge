
/* =========================================================
   GAME CONSTANTS
   Central config for all tunable game values
   ========================================================= */

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

/* Player */
export const PLAYER_SIZE = 18;
export const PLAYER_HORIZONTAL_SPEED = 160; // base — scales per level
export const PLAYER_START_X = GAME_WIDTH / 2;
export const PLAYER_START_Y = GAME_HEIGHT * 0.75;

/* -------------------------------------------------------
   LEVEL DEFINITIONS
   Each level lasts LEVEL_DURATION seconds.
   scrollSpeed  : how fast obstacles fall (px/s)
   spawnMs      : ms between obstacle spawns
   gapMin/Max   : horizontal gap range (px) — narrows on higher levels
   playerSpeedMult: multiplier on PLAYER_HORIZONTAL_SPEED
   color        : accent colour for obstacles at this level
   ------------------------------------------------------- */
export const LEVEL_DURATION = 10; // seconds per level

export interface LevelDef {
  scrollSpeed: number;
  spawnMs: number;
  gapMin: number;
  gapMax: number;
  playerSpeedMult: number;
  wallColor: number;
  label: string;
}

export const LEVELS: LevelDef[] = [
  // Level 1  — gentle intro
  { scrollSpeed: 200, spawnMs: 1400, gapMin: 130, gapMax: 170, playerSpeedMult: 1.0,  wallColor: 0xff2060, label: 'LEVEL 1' },
  // Level 2
  { scrollSpeed: 260, spawnMs: 1200, gapMin: 120, gapMax: 155, playerSpeedMult: 1.08, wallColor: 0xff4020, label: 'LEVEL 2' },
  // Level 3
  { scrollSpeed: 310, spawnMs: 1050, gapMin: 110, gapMax: 145, playerSpeedMult: 1.16, wallColor: 0xff8000, label: 'LEVEL 3' },
  // Level 4
  { scrollSpeed: 360, spawnMs:  900, gapMin: 100, gapMax: 135, playerSpeedMult: 1.24, wallColor: 0xffcc00, label: 'LEVEL 4' },
  // Level 5
  { scrollSpeed: 410, spawnMs:  780, gapMin:  92, gapMax: 125, playerSpeedMult: 1.32, wallColor: 0x88ff00, label: 'LEVEL 5' },
  // Level 6
  { scrollSpeed: 460, spawnMs:  680, gapMin:  84, gapMax: 115, playerSpeedMult: 1.40, wallColor: 0x00ffcc, label: 'LEVEL 6' },
  // Level 7
  { scrollSpeed: 510, spawnMs:  600, gapMin:  76, gapMax: 105, playerSpeedMult: 1.48, wallColor: 0x00aaff, label: 'LEVEL 7' },
  // Level 8
  { scrollSpeed: 555, spawnMs:  540, gapMin:  70, gapMax:  98, playerSpeedMult: 1.56, wallColor: 0x8800ff, label: 'LEVEL 8' },
  // Level 9
  { scrollSpeed: 595, spawnMs:  490, gapMin:  65, gapMax:  92, playerSpeedMult: 1.64, wallColor: 0xff00ff, label: 'LEVEL 9' },
  // Level 10+ (max difficulty — repeated for higher levels)
  { scrollSpeed: 630, spawnMs:  450, gapMin:  60, gapMax:  88, playerSpeedMult: 1.72, wallColor: 0xffffff, label: 'LEVEL MAX' },
];

/* Laser */
export const LASER_THICKNESS = 6;
export const LASER_WARN_DURATION = 800; // ms
export const LASER_STARTS_AT_LEVEL = 3; // lasers appear from this level on

/* Particles */
export const TRAIL_PARTICLE_LIFETIME = 350;
export const TRAIL_EMIT_INTERVAL = 35; // ms

/* Screen shake */
export const SHAKE_DURATION = 350;
export const SHAKE_INTENSITY = 0.015;

/* Obstacle */
export const OBSTACLE_THICKNESS = 18;

/* Colors */
export const COLOR_BG = 0x050510;
export const COLOR_PLAYER = 0x00ffff;
export const COLOR_WALL = 0xff2060;
export const COLOR_LASER = 0xffff00;
export const COLOR_SCORE = 0xffffff;
export const COLOR_TRAIL = 0x00ffff;
export const COLOR_SHIELD = 0x00aaff;
export const COLOR_SLOW = 0xaa00ff;
export const COLOR_DOUBLE = 0xffcc00;

/* Skins — player colours */
export const SKINS = [
  { name: 'Cyan',    color: 0x00ffff, hex: '#00ffff' },
  { name: 'Magenta', color: 0xff00ff, hex: '#ff00ff' },
  { name: 'Lime',    color: 0x00ff44, hex: '#00ff44' },
  { name: 'Gold',    color: 0xffcc00, hex: '#ffcc00' },
  { name: 'White',   color: 0xffffff, hex: '#ffffff' },
];

/* Storage keys */
export const STORAGE_HIGHSCORE   = 'neonDodge_highScore';
export const STORAGE_SKIN        = 'neonDodge_skin';
export const STORAGE_GAMES_PLAYED = 'neonDodge_gamesPlayed';
export const STORAGE_TOTAL_TIME  = 'neonDodge_totalTime';
export const STORAGE_MAX_COMBO   = 'neonDodge_maxCombo';

/* Combo system */
export const COMBO_X2 = 3;   // obstacles cleared for x2
export const COMBO_X3 = 7;   // obstacles cleared for x3
export const COMBO_X4 = 12;  // obstacles cleared for x4
export const COMBO_X5 = 18;  // obstacles cleared for x5

/* Near miss */
export const NEAR_MISS_DISTANCE = 34; // px from nearest obstacle edge to trigger
export const NEAR_MISS_BONUS = 50;

/* Power-ups */
export const POWERUP_SIZE = 14;
export const POWERUP_SPAWN_CHANCE = 0.18; // per obstacle wave
export const POWERUP_SLOW_DURATION = 3500; // ms
export const POWERUP_DOUBLE_DURATION = 5000; // ms
