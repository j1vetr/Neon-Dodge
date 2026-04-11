
/* =========================================================
   GAME CONSTANTS
   ========================================================= */

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

/* Player */
export const PLAYER_SIZE = 13;
export const PLAYER_HORIZONTAL_SPEED = 160;
export const PLAYER_START_X = GAME_WIDTH / 2;
export const PLAYER_START_Y = GAME_HEIGHT * 0.75;

/* -------------------------------------------------------
   LEVEL SYSTEM  —  20 levels, 12 seconds each
   Difficulty follows a smooth S-curve.
   Smooth interpolation between levels eliminates ALL
   sudden jumps — values are lerped frame-by-frame.

   Design guide:
     scrollSpeed   : obstacle fall speed px/s  (130→508)
     spawnMs       : ms between spawns         (1900→472)
     gapMin/Max    : horizontal gap px         (165→72 / 205→90)
     playerSpeedMult: multiplier on 160 px/s   (1.00→1.57)
     wallColor     : spectral colour journey (red→orange→yellow
                     →green→cyan→blue→purple→back to pink)
     zone          : shown on milestone levels (every 5)
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
  zone?: string; // milestone announcement text
}

/* -------------------------------------------------------
   ZONE LABELS shown on every 5th level boundary
   Zone 1  (L 1-5)  : ROOKIE   — learn the game
   Zone 2  (L 6-10) : PLAYER   — real challenge begins
   Zone 3  (L11-15) : VETERAN  — lasers + tight gaps
   Zone 4  (L16-20) : LEGEND   — elite reflexes required
   ------------------------------------------------------- */
export const LEVELS: LevelDef[] = [
  // ── ZONE 1: ROOKIE ─────────────────────────────────────
  // Level 1 — absolute beginner zone, very forgiving
  { scrollSpeed: 130, spawnMs: 1900, gapMin: 165, gapMax: 205,
    playerSpeedMult: 1.00, wallColor: 0xff2060,
    label: 'LEVEL 1', zone: 'ROOKIE' },
  // Level 2
  { scrollSpeed: 148, spawnMs: 1740, gapMin: 160, gapMax: 198,
    playerSpeedMult: 1.03, wallColor: 0xff3848,
    label: 'LEVEL 2' },
  // Level 3
  { scrollSpeed: 168, spawnMs: 1590, gapMin: 155, gapMax: 191,
    playerSpeedMult: 1.06, wallColor: 0xff5030,
    label: 'LEVEL 3' },
  // Level 4
  { scrollSpeed: 188, spawnMs: 1455, gapMin: 149, gapMax: 183,
    playerSpeedMult: 1.09, wallColor: 0xff6a18,
    label: 'LEVEL 4' },
  // Level 5
  { scrollSpeed: 208, spawnMs: 1330, gapMin: 143, gapMax: 175,
    playerSpeedMult: 1.12, wallColor: 0xff8800,
    label: 'LEVEL 5' },

  // ── ZONE 2: PLAYER ─────────────────────────────────────
  // Level 6 — speed clearly picks up
  { scrollSpeed: 232, spawnMs: 1220, gapMin: 137, gapMax: 167,
    playerSpeedMult: 1.16, wallColor: 0xffaa00,
    label: 'LEVEL 6', zone: 'PLAYER' },
  // Level 7
  { scrollSpeed: 258, spawnMs: 1120, gapMin: 130, gapMax: 159,
    playerSpeedMult: 1.20, wallColor: 0xffcc00,
    label: 'LEVEL 7' },
  // Level 8 — LASERS UNLOCK HERE
  { scrollSpeed: 286, spawnMs: 1030, gapMin: 123, gapMax: 151,
    playerSpeedMult: 1.24, wallColor: 0xaaff00,
    label: 'LEVEL 8' },
  // Level 9
  { scrollSpeed: 314, spawnMs:  948, gapMin: 117, gapMax: 143,
    playerSpeedMult: 1.28, wallColor: 0x44ff44,
    label: 'LEVEL 9' },
  // Level 10
  { scrollSpeed: 342, spawnMs:  874, gapMin: 111, gapMax: 136,
    playerSpeedMult: 1.32, wallColor: 0x00ffaa,
    label: 'LEVEL 10' },

  // ── ZONE 3: VETERAN ────────────────────────────────────
  // Level 11 — enters demanding territory
  { scrollSpeed: 368, spawnMs:  808, gapMin: 105, gapMax: 129,
    playerSpeedMult: 1.36, wallColor: 0x00ffdd,
    label: 'LEVEL 11', zone: 'VETERAN' },
  // Level 12
  { scrollSpeed: 392, spawnMs:  749, gapMin: 100, gapMax: 123,
    playerSpeedMult: 1.39, wallColor: 0x00ccff,
    label: 'LEVEL 12' },
  // Level 13
  { scrollSpeed: 414, spawnMs:  696, gapMin:  95, gapMax: 117,
    playerSpeedMult: 1.42, wallColor: 0x0099ff,
    label: 'LEVEL 13' },
  // Level 14
  { scrollSpeed: 433, spawnMs:  650, gapMin:  91, gapMax: 112,
    playerSpeedMult: 1.45, wallColor: 0x4466ff,
    label: 'LEVEL 14' },
  // Level 15
  { scrollSpeed: 450, spawnMs:  608, gapMin:  87, gapMax: 107,
    playerSpeedMult: 1.48, wallColor: 0x8844ff,
    label: 'LEVEL 15' },

  // ── ZONE 4: LEGEND ─────────────────────────────────────
  // Level 16 — elite difficulty
  { scrollSpeed: 465, spawnMs:  573, gapMin:  83, gapMax: 103,
    playerSpeedMult: 1.51, wallColor: 0xaa22ff,
    label: 'LEVEL 16', zone: 'LEGEND' },
  // Level 17
  { scrollSpeed: 478, spawnMs:  542, gapMin:  80, gapMax:  99,
    playerSpeedMult: 1.53, wallColor: 0xdd00ff,
    label: 'LEVEL 17' },
  // Level 18
  { scrollSpeed: 490, spawnMs:  515, gapMin:  77, gapMax:  96,
    playerSpeedMult: 1.55, wallColor: 0xff00dd,
    label: 'LEVEL 18' },
  // Level 19
  { scrollSpeed: 500, spawnMs:  492, gapMin:  74, gapMax:  93,
    playerSpeedMult: 1.57, wallColor: 0xff0088,
    label: 'LEVEL 19' },
  // Level 20 — MAX (colours complete full spectrum circle)
  { scrollSpeed: 508, spawnMs:  472, gapMin:  72, gapMax:  90,
    playerSpeedMult: 1.58, wallColor: 0xff2060,
    label: 'LEVEL 20', zone: 'MASTER' },
];

/* Laser */
export const LASER_THICKNESS = 6;
export const LASER_WARN_DURATION = 1000; // ms — more warning time
export const LASER_STARTS_AT_LEVEL = 8;  // gentle intro at level 8

/* Particles */
export const TRAIL_PARTICLE_LIFETIME = 350;
export const TRAIL_EMIT_INTERVAL = 35;

/* Screen shake */
export const SHAKE_DURATION = 350;
export const SHAKE_INTENSITY = 0.015;

/* Obstacle */
export const OBSTACLE_THICKNESS = 18;

/* Colors */
export const COLOR_BG    = 0x050510;
export const COLOR_PLAYER = 0x00ffff;
export const COLOR_WALL  = 0xff2060;
export const COLOR_LASER = 0xffff00;
export const COLOR_SCORE = 0xffffff;
export const COLOR_TRAIL = 0x00ffff;
export const COLOR_SHIELD = 0x00aaff;
export const COLOR_DOUBLE = 0xffcc00;

/* Skins */
export const SKINS = [
  { name: 'Cyan',    color: 0x00ffff, hex: '#00ffff' },
  { name: 'Magenta', color: 0xff00ff, hex: '#ff00ff' },
  { name: 'Lime',    color: 0x00ff44, hex: '#00ff44' },
  { name: 'Gold',    color: 0xffcc00, hex: '#ffcc00' },
  { name: 'White',   color: 0xffffff, hex: '#ffffff' },
];

/* Storage keys */
export const STORAGE_HIGHSCORE    = 'neonDodge_highScore';
export const STORAGE_SKIN         = 'neonDodge_skin';
export const STORAGE_GAMES_PLAYED = 'neonDodge_gamesPlayed';
export const STORAGE_TOTAL_TIME   = 'neonDodge_totalTime';
export const STORAGE_MAX_COMBO    = 'neonDodge_maxCombo';

/* Combo system */
export const COMBO_X2 = 3;
export const COMBO_X3 = 7;
export const COMBO_X4 = 12;
export const COMBO_X5 = 18;

/* Near miss */
export const NEAR_MISS_DISTANCE = 34;
export const NEAR_MISS_BONUS = 50;

/* Power-ups */
export const POWERUP_SIZE = 14;
export const POWERUP_SPAWN_CHANCE = 0.18;
export const POWERUP_DOUBLE_DURATION = 5000;
