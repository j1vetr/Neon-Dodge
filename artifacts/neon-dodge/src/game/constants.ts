
/* =========================================================
   GAME CONSTANTS  —  800 × dynamic  (adapts to device ratio)
   ========================================================= */

export const GAME_WIDTH  = 800;
const _ratio = typeof window !== 'undefined'
  ? window.innerHeight / window.innerWidth
  : 1.75;
export const GAME_HEIGHT = Math.max(1400, Math.round(GAME_WIDTH * _ratio));

/* Player */
export const PLAYER_SIZE              = 26;
export const PLAYER_HORIZONTAL_SPEED  = 320;
export const PLAYER_START_X           = GAME_WIDTH / 2;
export const PLAYER_START_Y           = GAME_HEIGHT * 0.75;

/* -------------------------------------------------------
   LEVEL SYSTEM  —  20 levels, 12 seconds each
   All pixel values (scrollSpeed, gapMin, gapMax) are ×2
   to match the 2× canvas resolution.
   ------------------------------------------------------- */
export const LEVEL_DURATION = 12; // seconds per level

export interface LevelDef {
  scrollSpeed: number;
  spawnMs: number;
  gapMin: number;
  gapMax: number;
  playerSpeedMult: number;
  wallColor: number;
  label: string;
  zone?: string;
}

export const LEVELS: LevelDef[] = [
  // ── ZONE 1: ROOKIE ─────────────────────────────────────
  { scrollSpeed: 260, spawnMs: 1900, gapMin: 330, gapMax: 410,
    playerSpeedMult: 1.00, wallColor: 0xff2060,
    label: 'LEVEL 1', zone: 'ROOKIE' },
  { scrollSpeed: 296, spawnMs: 1740, gapMin: 320, gapMax: 396,
    playerSpeedMult: 1.03, wallColor: 0xff3848,
    label: 'LEVEL 2' },
  { scrollSpeed: 336, spawnMs: 1590, gapMin: 310, gapMax: 382,
    playerSpeedMult: 1.06, wallColor: 0xff5030,
    label: 'LEVEL 3' },
  { scrollSpeed: 376, spawnMs: 1455, gapMin: 298, gapMax: 366,
    playerSpeedMult: 1.09, wallColor: 0xff6a18,
    label: 'LEVEL 4' },
  { scrollSpeed: 416, spawnMs: 1330, gapMin: 286, gapMax: 350,
    playerSpeedMult: 1.12, wallColor: 0xff8800,
    label: 'LEVEL 5' },

  // ── ZONE 2: PLAYER ─────────────────────────────────────
  { scrollSpeed: 464, spawnMs: 1220, gapMin: 274, gapMax: 334,
    playerSpeedMult: 1.16, wallColor: 0xffaa00,
    label: 'LEVEL 6', zone: 'PLAYER' },
  { scrollSpeed: 516, spawnMs: 1120, gapMin: 260, gapMax: 318,
    playerSpeedMult: 1.20, wallColor: 0xffcc00,
    label: 'LEVEL 7' },
  { scrollSpeed: 572, spawnMs: 1030, gapMin: 246, gapMax: 302,
    playerSpeedMult: 1.24, wallColor: 0xaaff00,
    label: 'LEVEL 8' },
  { scrollSpeed: 628, spawnMs:  948, gapMin: 234, gapMax: 286,
    playerSpeedMult: 1.28, wallColor: 0x44ff44,
    label: 'LEVEL 9' },
  { scrollSpeed: 684, spawnMs:  874, gapMin: 222, gapMax: 272,
    playerSpeedMult: 1.32, wallColor: 0x00ffaa,
    label: 'LEVEL 10' },

  // ── ZONE 3: VETERAN ────────────────────────────────────
  { scrollSpeed: 736, spawnMs:  808, gapMin: 210, gapMax: 258,
    playerSpeedMult: 1.36, wallColor: 0x00ffdd,
    label: 'LEVEL 11', zone: 'VETERAN' },
  { scrollSpeed: 784, spawnMs:  749, gapMin: 200, gapMax: 246,
    playerSpeedMult: 1.39, wallColor: 0x00ccff,
    label: 'LEVEL 12' },
  { scrollSpeed: 828, spawnMs:  696, gapMin: 190, gapMax: 234,
    playerSpeedMult: 1.42, wallColor: 0x0099ff,
    label: 'LEVEL 13' },
  { scrollSpeed: 866, spawnMs:  650, gapMin: 182, gapMax: 224,
    playerSpeedMult: 1.45, wallColor: 0x4466ff,
    label: 'LEVEL 14' },
  { scrollSpeed: 900, spawnMs:  608, gapMin: 174, gapMax: 214,
    playerSpeedMult: 1.48, wallColor: 0x8844ff,
    label: 'LEVEL 15' },

  // ── ZONE 4: LEGEND ─────────────────────────────────────
  { scrollSpeed: 930, spawnMs:  573, gapMin: 166, gapMax: 206,
    playerSpeedMult: 1.51, wallColor: 0xaa22ff,
    label: 'LEVEL 16', zone: 'LEGEND' },
  { scrollSpeed: 956, spawnMs:  542, gapMin: 160, gapMax: 198,
    playerSpeedMult: 1.53, wallColor: 0xdd00ff,
    label: 'LEVEL 17' },
  { scrollSpeed: 980, spawnMs:  515, gapMin: 154, gapMax: 192,
    playerSpeedMult: 1.55, wallColor: 0xff00dd,
    label: 'LEVEL 18' },
  { scrollSpeed: 1000, spawnMs: 492, gapMin: 148, gapMax: 186,
    playerSpeedMult: 1.57, wallColor: 0xff0088,
    label: 'LEVEL 19' },
  { scrollSpeed: 1016, spawnMs: 472, gapMin: 144, gapMax: 180,
    playerSpeedMult: 1.58, wallColor: 0xff2060,
    label: 'LEVEL 20', zone: 'MASTER' },
];

/* Laser */
export const LASER_THICKNESS       = 12;
export const LASER_WARN_DURATION   = 1000;
export const LASER_STARTS_AT_LEVEL = 8;

/* Particles */
export const TRAIL_PARTICLE_LIFETIME = 350;
export const TRAIL_EMIT_INTERVAL     = 35;

/* Screen shake */
export const SHAKE_DURATION  = 350;
export const SHAKE_INTENSITY = 0.010;

/* Obstacle */
export const OBSTACLE_THICKNESS = 36;

/* Colors */
export const COLOR_BG     = 0x050510;
export const COLOR_PLAYER = 0x00ffff;
export const COLOR_WALL   = 0xff2060;
export const COLOR_LASER  = 0xffff00;
export const COLOR_SCORE  = 0xffffff;
export const COLOR_TRAIL  = 0x00ffff;
export const COLOR_SHIELD = 0x00aaff;
export const COLOR_DOUBLE = 0xffcc00;

/* Skins — name field artık sadece fallback, i18n.skinNames kullanılıyor */
export const SKINS = [
  { name: 'KLASİK', key: 'skin-klasik', color: 0x00ffff, hex: '#00ffff' },
  { name: 'NASA',   key: 'skin-nasa',   color: 0x4499ff, hex: '#4499ff' },
  { name: 'TÜRK',   key: 'skin-turk',   color: 0xff3344, hex: '#ff3344' },
  { name: 'ORMAN',  key: 'skin-orman',  color: 0x44dd88, hex: '#44dd88' },
];

/* Storage keys */
export const STORAGE_HIGHSCORE    = 'neonDodge_highScore';
export const STORAGE_SKIN         = 'neonDodge_skin';
export const STORAGE_GAMES_PLAYED = 'neonDodge_gamesPlayed';
export const STORAGE_TOTAL_TIME   = 'neonDodge_totalTime';
export const STORAGE_MAX_COMBO    = 'neonDodge_maxCombo';

/* Combo system — Near-Miss Streak */
export const COMBO_X2 = 2;   /* 2 yakın geçiş → ×2 */
export const COMBO_X3 = 5;   /* 5 → ×3 */
export const COMBO_X4 = 9;   /* 9 → ×4 */
export const COMBO_X5 = 14;  /* 14 → ×5 */

/* Near miss */
export const NEAR_MISS_DISTANCE    = 90;   /* yakın geçiş eşiği (px) */
export const NEAR_MISS_WAVE_BONUS  = 60;   /* yakın geçiş puan bonusu × comboMultiplier */
export const BASE_WAVE_BONUS       = 20;   /* güvenli geçiş baz puanı (combo sıfırlanır) */

/* Power-ups */
export const POWERUP_SIZE            = 28;
export const POWERUP_SPAWN_CHANCE    = 0.20;
export const POWERUP_DOUBLE_DURATION = 5000;
export const POWERUP_SHRINK_DURATION = 4000;
export const POWERUP_SHRINK_SCALE    = 0.5;
export const COLOR_SHRINK            = 0xddaa00;

/* Sound */
export const STORAGE_SOUND = 'neonDodge_sound';
export const STORAGE_MUSIC = 'neonDodge_music';
