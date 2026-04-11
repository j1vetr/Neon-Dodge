
/* =========================================================
   GAME SCENE
   Core gameplay: auto-scroll, tap to switch direction,
   obstacles, lasers, power-ups, combo, near-miss,
   scrolling stars, shield, slow, double-points.
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT,
  PLAYER_SIZE, PLAYER_HORIZONTAL_SPEED, PLAYER_START_X, PLAYER_START_Y,
  LEVELS, LEVEL_DURATION, LevelDef,
  OBSTACLE_THICKNESS,
  TRAIL_PARTICLE_LIFETIME, TRAIL_EMIT_INTERVAL,
  SHAKE_DURATION, SHAKE_INTENSITY,
  COLOR_BG, COLOR_SHIELD, COLOR_DOUBLE,
  SKINS, STORAGE_HIGHSCORE, STORAGE_GAMES_PLAYED, STORAGE_TOTAL_TIME, STORAGE_MAX_COMBO,
  COMBO_X2, COMBO_X3, COMBO_X4, COMBO_X5,
  NEAR_MISS_DISTANCE, NEAR_MISS_BONUS,
  POWERUP_SIZE, POWERUP_SPAWN_CHANCE, POWERUP_DOUBLE_DURATION,
} from '../constants';
import {
  playTap, playHit, playScore,
  playCombo, playNearMiss, playPowerUp, playShieldHit,
  startAmbient, updateAmbientLevel, stopAmbient,
  initSound, setSoundEnabled, isSoundEnabled,
} from '../audio';

/* ---- Types ---- */
interface Obstacle {
  body: Phaser.GameObjects.Rectangle;
  isLaser: boolean;
  born?: number;
  waveId: number;
  passed?: boolean;
}

interface PowerUp {
  body: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  type: 'shield' | 'double';
  collected: boolean;
}

interface TrailParticle {
  circle: Phaser.GameObjects.Arc;
  born: number;
  lifetime: number;
}

export class GameScene extends Phaser.Scene {
  /* Player */
  private player!: Phaser.GameObjects.Container;
  private playerGlow!: Phaser.GameObjects.Arc;
  private playerColor!: number;
  private dirX = 1;
  private playerVX = 0;

  /* Shield */
  private shieldActive = false;
  private invincibleUntil = 0; // i-frames after shield break
  private shieldRing!: Phaser.GameObjects.Arc;
  private shieldGlow!: Phaser.GameObjects.Arc;

  /* Obstacles */
  private obstacles: Obstacle[] = [];
  private spawnTimer = 0;
  private waveCounter = 0;
  private passedWaveIds = new Set<number>();

  /* Power-ups */
  private powerUps: PowerUp[] = [];
  private doubleUntil = 0;

  /* Power-up HUD */
  private doubleTimerTxt!: Phaser.GameObjects.Text;
  private shieldIcon!: Phaser.GameObjects.Text;

  /* Trail */
  private trailParticles: TrailParticle[] = [];
  private lastTrailTime = 0;

  /* Stars (scrolling) */
  private stars: Phaser.GameObjects.Arc[] = [];
  private starSpeeds: number[] = [];

  /* Score / time */
  private score = 0;            // float accumulator
  private scoreDisplay = 0;    // last displayed integer (avoids redraws every frame)
  private elapsedTime = 0;
  private scoreTxt!: Phaser.GameObjects.Text;
  private highScore = 0;
  private lastScoreSoundAt = 0; // for score sound throttle

  /* Power-up cooldown */
  private lastPowerUpTime = -99999; // ms since game start when last power-up spawned

  /* Pause */
  private paused = false;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pausePanel!: Phaser.GameObjects.Container;
  private pauseBtn!: Phaser.GameObjects.Text;
  private soundToggleLabel!: Phaser.GameObjects.Text;

  /* Combo */
  private combo = 0;
  private maxCombo = 0;
  private comboMultiplier = 1;
  private comboHUD!: Phaser.GameObjects.Text;
  private lastComboTier = 0;

  /* Level system */
  private currentLevel = 0;
  private levelDef!: LevelDef;
  private levelTxt!: Phaser.GameObjects.Text;
  private levelBannerContainer!: Phaser.GameObjects.Container;
  private levelProgressBg!: Phaser.GameObjects.Rectangle;
  private levelProgressFill!: Phaser.GameObjects.Rectangle;
  private levelProgressColor = 0xff2060;

  /* ── Smooth interpolation between levels ──────────────
     Instead of hard jumps at level boundaries, ALL numeric
     parameters (speed, gap, spawnMs, playerSpeedMult) are
     linearly interpolated frame-by-frame between the current
     level definition and the NEXT one, using a smoothstep
     easing curve.  This eliminates every sudden difficulty jump.
  ─────────────────────────────────────────────────────── */

  /** Raw linear progress within current level [0..1] */
  private get _lvlRawT(): number {
    const t = (this.elapsedTime - this.currentLevel * LEVEL_DURATION) / LEVEL_DURATION;
    return Math.max(0, Math.min(1, t));
  }

  /** Smoothstepped progress — change is fastest at mid-level, gentle at edges */
  private get _lvlEasedT(): number {
    const t = this._lvlRawT;
    return t * t * (3 - 2 * t);
  }

  /** Lerp any numeric LevelDef field between current and next level */
  private _lerpNum(key: 'scrollSpeed' | 'spawnMs' | 'gapMin' | 'gapMax' | 'playerSpeedMult'): number {
    const next = Math.min(this.currentLevel + 1, LEVELS.length - 1);
    const a = LEVELS[this.currentLevel][key] as number;
    const b = LEVELS[next][key] as number;
    return a + (b - a) * this._lvlEasedT;
  }

  /** Lerp wall colour component-wise */
  private _lerpWallColor(): number {
    const next = Math.min(this.currentLevel + 1, LEVELS.length - 1);
    const c1 = LEVELS[this.currentLevel].wallColor;
    const c2 = LEVELS[next].wallColor;
    const t = this._lvlEasedT;
    const r = Math.round(((c1 >> 16) & 0xff) + (((c2 >> 16) & 0xff) - ((c1 >> 16) & 0xff)) * t);
    const g = Math.round(((c1 >> 8) & 0xff) + (((c2 >> 8) & 0xff) - ((c1 >> 8) & 0xff)) * t);
    const b = Math.round((c1 & 0xff) + ((c2 & 0xff) - (c1 & 0xff)) * t);
    return (r << 16) | (g << 8) | b;
  }

  /* State */
  private alive = true;
  private lastTapTime = 0;
  private skinIndex = 0;

  constructor() { super({ key: 'GameScene' }); }

  init(data: { skin?: number }) {
    this.skinIndex = data?.skin ?? 0;
    this.playerColor = SKINS[this.skinIndex].color;
  }

  /* --------------------------------------------------------
     CREATE
  -------------------------------------------------------- */
  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* Load saved sound preference */
    initSound();

    /* Background */
    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);
    this._createScrollingStars();
    this._createGrid();

    /* Shield glow (behind player, hidden until active) */
    this.shieldGlow = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE + 18, COLOR_SHIELD, 0);
    this.shieldGlow.setDepth(8);
    this.shieldRing = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE + 12, COLOR_SHIELD, 0);
    this.shieldRing.setDepth(9);
    this.shieldRing.setStrokeStyle(3, COLOR_SHIELD, 0);

    /* Player glow ring (behind player) */
    this.playerGlow = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE + 10, this.playerColor, 0.12);
    this.playerGlow.setDepth(9);

    /* Player — rocket ship */
    this.player = this._buildRocket(PLAYER_START_X, PLAYER_START_Y, this.playerColor);
    this.player.setDepth(10);

    /* HUD — score (center top) */
    this.scoreTxt = this.add.text(W / 2, 28, '0', {
      fontSize: '26px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#00ffff', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(20);

    /* HUD — best (top right) */
    this.highScore = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    this.add.text(W - 12, 14, `Best: ${this.highScore}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#334455',
    }).setOrigin(1, 0).setDepth(20);

    /* HUD — level (top left) */
    this.levelTxt = this.add.text(12, 14, 'LVL 1', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ff2060',
    }).setOrigin(0, 0).setDepth(20);

    /* HUD — level progress bar (thin bar under level text) */
    this.levelProgressBg = this.add.rectangle(12, 30, 56, 3, 0x112233, 1).setOrigin(0, 0).setDepth(20);
    this.levelProgressFill = this.add.rectangle(12, 30, 2, 3, 0xff2060, 1).setOrigin(0, 0).setDepth(21);

    /* HUD — combo (top left, below level) */
    this.comboHUD = this.add.text(12, 36, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0, 0).setDepth(20);

    /* HUD — power-up timers */
    this.doubleTimerTxt = this.add.text(W / 2, 50, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffcc00',
      stroke: '#885500', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(20);

    this.shieldIcon = this.add.text(W - 12, 30, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#00aaff',
      stroke: '#003366', strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(20);

    /* Level-up banner container */
    this.levelBannerContainer = this.add.container(W / 2, H / 2);
    this.levelBannerContainer.setDepth(30);
    this.levelBannerContainer.setAlpha(0);

    /* Pause button — top-right corner */
    this.pauseBtn = this.add.text(W - 14, 14, 'II', {
      fontSize: '15px', fontFamily: 'monospace', color: '#aabbcc',
    }).setOrigin(1, 0).setDepth(25).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerover', () => this.pauseBtn.setColor('#ffffff'));
    this.pauseBtn.on('pointerout', () => this.pauseBtn.setColor('#aabbcc'));
    this.pauseBtn.on('pointerdown', () => this._togglePause());

    /* Build pause panel (hidden by default) */
    this._buildPausePanel();

    /* Input */
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => this._onPointerDown(ptr), this);
    this.input.keyboard?.on('keydown-SPACE', this._onTap, this);
    this.input.keyboard?.on('keydown-ESC', () => this._togglePause(), this);

    /* Reset state */
    this.alive = true;
    this.paused = false;
    this.score = 0;
    this.scoreDisplay = 0;
    this.lastScoreSoundAt = 0;
    this.elapsedTime = 0;
    this.spawnTimer = 0;
    this.lastPowerUpTime = -99999;
    this.obstacles = [];
    this.powerUps = [];
    this.trailParticles = [];
    this.dirX = 1;
    this.currentLevel = 0;
    this.levelDef = LEVELS[0];
    this.playerVX = PLAYER_HORIZONTAL_SPEED * this._lerpNum('playerSpeedMult');
    this.combo = 0;
    this.maxCombo = 0;
    this.comboMultiplier = 1;
    this.lastComboTier = 0;
    this.waveCounter = 0;
    this.passedWaveIds.clear();
    this.shieldActive = false;
    this.invincibleUntil = 0;
    this.doubleUntil = 0;

    this._updateLevelLabel();

    /* Start ambient rhythm */
    startAmbient(0);
  }

  /* --------------------------------------------------------
     TAP HANDLER
  -------------------------------------------------------- */
  private _onPointerDown(ptr: Phaser.Input.Pointer) {
    /* Skip direction change if a UI interactive object was tapped */
    if (this.input.hitTestPointer(ptr).length > 0) return;
    this._onTap();
  }

  private _onTap() {
    if (!this.alive || this.paused) return;
    const now = this.time.now;
    if (now - this.lastTapTime < 80) return;
    this.lastTapTime = now;

    this.dirX *= -1;
    this.playerVX = PLAYER_HORIZONTAL_SPEED * this._lerpNum('playerSpeedMult') * this.dirX;
    playTap();

    /* Squeeze + direction tilt on tap */
    this.tweens.add({
      targets: this.player,
      scaleX: 1.25, scaleY: 0.85,
      duration: 65, yoyo: true,
    });
    this.tweens.add({
      targets: this.player,
      rotation: this.dirX * 0.18,
      duration: 120, ease: 'Sine.easeOut',
    });
  }

  /* --------------------------------------------------------
     MAIN UPDATE
  -------------------------------------------------------- */
  update(time: number, delta: number) {
    if (!this.alive || this.paused) return;

    const dt = delta / 1000;
    this.elapsedTime += dt;
    const now = this.time.now;

    /* ------- Level progression ------- */
    const targetLevel = Math.min(
      Math.floor(this.elapsedTime / LEVEL_DURATION),
      LEVELS.length - 1,
    );
    if (targetLevel > this.currentLevel) {
      this.currentLevel = targetLevel;
      this.levelDef = LEVELS[this.currentLevel];
      this._onLevelUp();
    }

    /* ------- Level progress bar (reflects raw time in level) ------- */
    const barW = Math.max(2, 56 * this._lvlRawT);
    this.levelProgressFill.setDisplaySize(barW, 3);
    const barColor = this._lerpWallColor();
    this.levelProgressColor = barColor;
    this.levelProgressFill.setFillStyle(barColor, 1);
    /* Also update level text colour to match current obstacle color */
    this.levelTxt.setStyle({ color: '#' + barColor.toString(16).padStart(6, '0') });

    /* ------- Score: delta-time accumulation (never freezes, no rewind) ------- */
    const doubleActive = now < this.doubleUntil;
    /* Base: 10 pts/s × combo multiplier × 2x multiplier */
    this.score += (dt / 1000) * 10 * this.comboMultiplier * (doubleActive ? 2 : 1);
    const displayNow = Math.floor(this.score);
    if (displayNow !== this.scoreDisplay) {
      this.scoreDisplay = displayNow;
      this.scoreTxt.setText(`${displayNow}`);
      /* Score sound every 50 points */
      if (displayNow - this.lastScoreSoundAt >= 50) {
        this.lastScoreSoundAt = displayNow;
        playScore(1);
      }
    }

    /* ------- Player horizontal movement ------- */
    const px = this.player.x + this.playerVX * dt;
    const clamped = Phaser.Math.Clamp(px, PLAYER_SIZE + 2, GAME_WIDTH - PLAYER_SIZE - 2);
    if (px !== clamped) {
      this.dirX *= -1;
      this.playerVX = PLAYER_HORIZONTAL_SPEED * this._lerpNum('playerSpeedMult') * this.dirX;
    }
    this.player.x = clamped;
    this.playerGlow.x = clamped;
    this.playerGlow.y = this.player.y;
    this.shieldRing.x = clamped;
    this.shieldRing.y = this.player.y;
    this.shieldGlow.x = clamped;
    this.shieldGlow.y = this.player.y;

    /* ------- Scrolling stars ------- */
    this._updateScrollingStars(dt);

    /* ------- Spawn obstacles (rate smoothly interpolated) ------- */
    this.spawnTimer += delta;
    if (this.spawnTimer >= this._lerpNum('spawnMs')) {
      this.spawnTimer = 0;
      this._spawnObstacle(time);
    }

    /* ------- Move obstacles (with near-miss + combo) ------- */
    this._updateObstacles(dt, time);

    /* ------- Move power-ups ------- */
    this._updatePowerUps(dt);

    /* ------- Collision (shield-aware) ------- */
    if (this._checkCollision()) {
      if (this.shieldActive) {
        this._breakShield();
      } else {
        this._onDeath();
        return;
      }
    }

    /* ------- Trail ------- */
    if (time - this.lastTrailTime > TRAIL_EMIT_INTERVAL) {
      this.lastTrailTime = time;
      this._emitTrail(time);
    }
    this._updateTrail(time);

    /* ------- Glow pulse ------- */
    this.playerGlow.setRadius(PLAYER_SIZE + 8 + Math.sin(time * 0.005) * 4);
    if (this.shieldActive) {
      const pulse = 0.25 + 0.15 * Math.sin(time * 0.012);
      this.shieldRing.setStrokeStyle(3, COLOR_SHIELD, pulse + 0.5);
      this.shieldGlow.setAlpha(pulse);
    }

    /* ------- Power-up timer HUD ------- */
    this._updatePowerUpHUD(now);
  }

  /* --------------------------------------------------------
     LEVEL UP
  -------------------------------------------------------- */
  private _onLevelUp() {
    this._updateLevelLabel();
    playScore(this.currentLevel);
    updateAmbientLevel(this.currentLevel);

    this.cameras.main.flash(320, 20, 20, 20);

    const W = GAME_WIDTH;
    const def = this.levelDef;
    const col = def.wallColor;
    const hex = '#' + col.toString(16).padStart(6, '0');
    const isZoneEntry = !!def.zone;
    const bannerH = isZoneEntry ? 76 : 58;

    this.levelBannerContainer.removeAll(true);
    this.levelBannerContainer.setAlpha(0);
    this.levelBannerContainer.setPosition(W / 2, GAME_HEIGHT * 0.40);

    const pill = this.add.rectangle(0, 0, 280, bannerH, 0x000000, 0.82);
    pill.setStrokeStyle(isZoneEntry ? 3 : 2, col, 1);
    this.levelBannerContainer.add(pill);

    if (isZoneEntry) {
      /* Zone banner: zone name above, level label below */
      const zoneTxt = this.add.text(0, -18, `◆  ${def.zone}  ◆`, {
        fontSize: '13px', fontFamily: 'monospace',
        color: hex, stroke: hex, strokeThickness: 1,
        letterSpacing: 4,
      }).setOrigin(0.5);
      this.levelBannerContainer.add(zoneTxt);

      const lvlTxt = this.add.text(0, 6, def.label, {
        fontSize: '24px', fontFamily: 'monospace',
        color: hex, stroke: hex, strokeThickness: 1,
      }).setOrigin(0.5);
      this.levelBannerContainer.add(lvlTxt);

      const subTxt = this.add.text(0, 30, `NEW ZONE UNLOCKED`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#445566', letterSpacing: 2,
      }).setOrigin(0.5);
      this.levelBannerContainer.add(subTxt);
    } else {
      /* Regular level banner */
      const lvlTxt = this.add.text(0, -10, def.label, {
        fontSize: '26px', fontFamily: 'monospace',
        color: hex, stroke: hex, strokeThickness: 1,
      }).setOrigin(0.5);
      this.levelBannerContainer.add(lvlTxt);

      const speed = Math.round(this._lerpNum('scrollSpeed'));
      const subTxt = this.add.text(0, 16, `↓ ${speed} px/s`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5);
      this.levelBannerContainer.add(subTxt);
    }

    /* Zoom-in → hold → fade */
    this.levelBannerContainer.setScale(0.55);
    const holdMs = isZoneEntry ? 1400 : 900;
    this.tweens.add({
      targets: this.levelBannerContainer,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 220, ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(holdMs, () => {
          this.tweens.add({
            targets: this.levelBannerContainer,
            alpha: 0, scaleX: 1.1, scaleY: 1.1,
            duration: 300,
          });
        });
      },
    });
  }

  private _updateLevelLabel() {
    /* Level text colour is driven by _lerpWallColor() in update(),
       so we only update the text string here. */
    this.levelTxt.setText(`LVL ${this.currentLevel + 1}`);
  }

  /* --------------------------------------------------------
     OBSTACLE SPAWNING
  -------------------------------------------------------- */
  private _spawnObstacle(_time: number) {
    const W = GAME_WIDTH;
    const waveId = ++this.waveCounter;
    const y = -20;

    const gMin = Math.round(this._lerpNum('gapMin'));
    const gMax = Math.round(this._lerpNum('gapMax'));
    const gapSize = Phaser.Math.Between(gMin, gMax);
    const gapX = Phaser.Math.Between(PLAYER_SIZE * 2, W - PLAYER_SIZE * 2 - gapSize);
    const wc = this._lerpWallColor();

    const leftW = gapX;
    const left = this.add.rectangle(leftW / 2, y, leftW, OBSTACLE_THICKNESS, wc, 1);

    const rightW = W - gapX - gapSize;
    const rightX = gapX + gapSize + rightW / 2;
    const right = this.add.rectangle(rightX, y, rightW, OBSTACLE_THICKNESS, wc, 1);

    this.obstacles.push(
      { body: left,  isLaser: false, waveId },
      { body: right, isLaser: false, waveId },
    );

    /* Maybe spawn a power-up: max 1 on screen, min 8s apart */
    const sinceLastPowerUp = this.elapsedTime * 1000 - this.lastPowerUpTime;
    if (
      this.powerUps.length === 0 &&
      sinceLastPowerUp >= 8000 &&
      Math.random() < POWERUP_SPAWN_CHANCE
    ) {
      this._spawnPowerUp();
      this.lastPowerUpTime = this.elapsedTime * 1000;
    }
  }

  /* --------------------------------------------------------
     POWER-UP SPAWNING
  -------------------------------------------------------- */
  private _spawnPowerUp() {
    const W = GAME_WIDTH;
    const types: Array<'shield' | 'double'> = ['shield', 'double'];
    const type = types[Math.floor(Math.random() * types.length)];

    const colorMap = { shield: COLOR_SHIELD, double: COLOR_DOUBLE };
    const color    = colorMap[type];
    const hexColor = '#' + color.toString(16).padStart(6, '0');

    /* Badge dimensions — both types are square to frame the icon */
    const bw = 44;
    const bh = 44;

    const x = Phaser.Math.Between(bw / 2 + 10, W - bw / 2 - 10);
    const y = -bh - 10;

    /* Outer pulsing ring */
    const ring = this.add.circle(x, y, bw * 0.75, color, 0.12);
    ring.setDepth(5);

    /* Badge background */
    const body = this.add.rectangle(x, y, bw, bh, 0x000000, 0.82)
      .setStrokeStyle(2, color, 1);
    body.setDepth(6);

    /* Icon — transparent PNG, tint colours it with the power-up colour */
    const iconKey = type === 'shield' ? 'icon-shield' : 'icon-double';
    const icon = this.add.image(x, y, iconKey)
      .setDisplaySize(30, 30)
      .setTint(color)
      .setDepth(7);

    /* Pulsing ring tween */
    this.tweens.add({
      targets: ring,
      scaleX: 1.6, scaleY: 1.6, alpha: 0,
      duration: 800, repeat: -1, ease: 'Sine.easeOut',
    });

    /* Gentle float tween on badge only — icon excluded because absolute
       scaleX would override setDisplaySize on the 1024×1024 source PNG */
    this.tweens.add({
      targets: body,
      scaleX: 1.06, scaleY: 1.06,
      duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.powerUps.push({ body, icon, ring, type, collected: false });
  }

  /* --------------------------------------------------------
     POWER-UP UPDATE
  -------------------------------------------------------- */
  private _updatePowerUps(dt: number) {
    const speed = this._lerpNum('scrollSpeed') * 0.55;
    const toRemove: number[] = [];

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (pu.collected) { toRemove.push(i); continue; }

      pu.body.y += speed * dt;
      pu.icon.y += speed * dt;
      pu.ring.y  += speed * dt;

      /* Collect check */
      const dx = this.player.x - pu.body.x;
      const dy = this.player.y - pu.body.y;
      if (dx * dx + dy * dy < (PLAYER_SIZE + POWERUP_SIZE) * (PLAYER_SIZE + POWERUP_SIZE)) {
        this._collectPowerUp(pu);
        toRemove.push(i);
        continue;
      }

      if (pu.body.y > GAME_HEIGHT + 40) {
        pu.body.destroy(); pu.icon.destroy(); pu.ring.destroy();
        toRemove.push(i);
      }
    }
    toRemove.forEach(i => this.powerUps.splice(i, 1));
  }

  private _collectPowerUp(pu: PowerUp) {
    pu.collected = true;
    playPowerUp(pu.type);

    /* Flash */
    const colorMap = { shield: COLOR_SHIELD, double: COLOR_DOUBLE };
    const c = colorMap[pu.type];
    const flash = this.add.circle(pu.body.x, pu.body.y, POWERUP_SIZE * 2.5, c, 0.6).setDepth(15);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 280, onComplete: () => flash.destroy() });

    pu.body.destroy(); pu.icon.destroy(); pu.ring.destroy();

    if (pu.type === 'shield') {
      this.shieldActive = true;
      this.shieldRing.setStrokeStyle(3, COLOR_SHIELD, 1);
      this.shieldGlow.setAlpha(0.2);
    } else if (pu.type === 'double') {
      this.doubleUntil = this.time.now + POWERUP_DOUBLE_DURATION;
    }

    this._showPopupText(
      pu.type === 'shield' ? '🛡 SHIELD!' : '×2 DOUBLE!',
      '#' + c.toString(16).padStart(6, '0'),
    );
  }

  /* --------------------------------------------------------
     SHIELD BREAK
  -------------------------------------------------------- */
  private _breakShield() {
    this.shieldActive = false;
    /* Grant invincibility frames so player passes through the obstacle */
    this.invincibleUntil = this.time.now + 900;
    playShieldHit();
    this.cameras.main.shake(200, 0.010);

    this.shieldRing.setStrokeStyle(3, COLOR_SHIELD, 0);
    this.shieldGlow.setAlpha(0);

    /* Shield shatter burst */
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const spd = Phaser.Math.Between(50, 130);
      const px = this.player.x, py = this.player.y;
      const shard = this.add.circle(px, py, Phaser.Math.Between(2, 4), COLOR_SHIELD, 0.9).setDepth(15);
      this.tweens.add({
        targets: shard,
        x: px + Math.cos(angle) * spd,
        y: py + Math.sin(angle) * spd,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: Phaser.Math.Between(250, 500),
        onComplete: () => shard.destroy(),
      });
    }

    this._showPopupText('SHIELD BROKEN!', '#00aaff');
  }

  /* --------------------------------------------------------
     OBSTACLE UPDATE — near-miss + combo tracking
  -------------------------------------------------------- */
  private _updateObstacles(dt: number, time: number) {
    const rawSpeed = this._lerpNum('scrollSpeed');
    const speed = rawSpeed;
    const toRemove: number[] = [];

    /* Compute current lerped colour once — applied to every bar this frame */
    const liveColor = this._lerpWallColor();

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.body.y += speed * dt;

      /* Update obstacle colour live every frame */
      obs.body.setFillStyle(liveColor, 1);

      /* Near-miss + combo: first time obstacle row crosses PLAYER_START_Y */
      if (!obs.passed && obs.body.y > PLAYER_START_Y) {
        obs.passed = true;

        /* Check near miss (only for non-laser) */
        if (!obs.isLaser) {
          const nearX = Phaser.Math.Clamp(this.player.x, obs.body.x - obs.body.displayWidth / 2, obs.body.x + obs.body.displayWidth / 2);
          const distX = Math.abs(this.player.x - nearX);
          if (distX > 0 && distX < NEAR_MISS_DISTANCE) {
            this._onNearMiss();
          }
        }

        /* Combo: count wave once when first block of that wave passes */
        if (!this.passedWaveIds.has(obs.waveId)) {
          this.passedWaveIds.add(obs.waveId);
          this._incrementCombo();
        }
      }

      if (obs.body.y > GAME_HEIGHT + 40) {
        obs.body.destroy();
        toRemove.push(i);
      }
    }
    toRemove.forEach(i => this.obstacles.splice(i, 1));
  }

  /* --------------------------------------------------------
     PAUSE PANEL
  -------------------------------------------------------- */
  private _buildPausePanel() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* Full-screen dimmer */
    this.pauseOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72)
      .setDepth(79).setVisible(false);

    /* Panel container centred */
    this.pausePanel = this.add.container(W / 2, H / 2).setDepth(80).setVisible(false);

    const PW = 230, PH = 220;

    /* Panel background */
    const bg = this.add.rectangle(0, 0, PW, PH, 0x080820, 1);
    const border = this.add.rectangle(0, 0, PW, PH).setStrokeStyle(1.5, 0x00ffff, 0.7);
    border.setFillStyle(0x000000, 0); // transparent fill

    /* Title */
    const title = this.add.text(0, -PH / 2 + 28, 'PAUSED', {
      fontSize: '22px', fontFamily: 'monospace',
      color: '#050510', stroke: '#00ffff', strokeThickness: 2,
    }).setOrigin(0.5);

    /* Helper: neon button */
    const makeBtn = (y: number, label: string, color: number, textColor: string) => {
      const BW = 170, BH = 36;
      const btnBg = this.add.rectangle(0, y, BW, BH, color, 0.15);
      const btnBorder = this.add.rectangle(0, y, BW, BH).setStrokeStyle(1, color, 0.8);
      btnBorder.setFillStyle(0x000000, 0);
      const btnTxt = this.add.text(0, y, label, {
        fontSize: '13px', fontFamily: 'monospace', color: textColor,
      }).setOrigin(0.5);
      /* Hit area on the text but make it larger via bg */
      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on('pointerover', () => btnBg.setAlpha(0.35));
      btnBg.on('pointerout',  () => btnBg.setAlpha(0.15));
      return { btnBg, btnBorder, btnTxt };
    };

    /* Resume button */
    const resume = makeBtn(-55, '▶  RESUME', 0x00ffcc, '#00ffcc');
    resume.btnBg.on('pointerdown', () => this._togglePause());

    /* Sound toggle button */
    const soundLabel = isSoundEnabled() ? '🔊  SOUND ON' : '🔇  SOUND OFF';
    const sound = makeBtn(0, soundLabel, 0x4488ff, '#4488ff');
    this.soundToggleLabel = sound.btnTxt;
    sound.btnBg.on('pointerdown', () => {
      const next = !isSoundEnabled();
      setSoundEnabled(next);
      this.soundToggleLabel.setText(next ? '🔊  SOUND ON' : '🔇  SOUND OFF');
      if (next) startAmbient(this.currentLevel);
    });

    /* Main menu button */
    const menu = makeBtn(55, '⟵  MAIN MENU', 0xff4477, '#ff4477');
    menu.btnBg.on('pointerdown', () => {
      stopAmbient();
      this.scene.start('StartScene', { skin: this.skinIndex });
    });

    this.pausePanel.add([
      bg, border, title,
      resume.btnBg, resume.btnBorder, resume.btnTxt,
      sound.btnBg, sound.btnBorder, sound.btnTxt,
      menu.btnBg, menu.btnBorder, menu.btnTxt,
    ]);
  }

  private _togglePause() {
    if (!this.alive) return;
    this.paused = !this.paused;

    if (this.paused) {
      stopAmbient();
      /* Update sound label in case changed outside */
      this.soundToggleLabel.setText(isSoundEnabled() ? '🔊  SOUND ON' : '🔇  SOUND OFF');
      this.pauseOverlay.setVisible(true);
      this.pausePanel.setVisible(true);
      /* Dim the pause button while paused */
      this.pauseBtn.setColor('#555566');
    } else {
      this.pauseOverlay.setVisible(false);
      this.pausePanel.setVisible(false);
      this.pauseBtn.setColor('#aabbcc');
      if (isSoundEnabled()) startAmbient(this.currentLevel);
    }
  }

  /* --------------------------------------------------------
     NEAR MISS
  -------------------------------------------------------- */
  private _onNearMiss() {
    playNearMiss();
    const bonus = NEAR_MISS_BONUS * (this.time.now < this.doubleUntil ? 2 : 1);
    this.score += bonus;
    this.scoreDisplay = Math.floor(this.score);
    this.scoreTxt.setText(`${this.scoreDisplay}`);
    this._showPopupText(`+${bonus} CLOSE!`, '#ff8800');
  }

  /* --------------------------------------------------------
     COMBO
  -------------------------------------------------------- */
  private _incrementCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const tier =
      this.combo >= COMBO_X5 ? 4 :
      this.combo >= COMBO_X4 ? 3 :
      this.combo >= COMBO_X3 ? 2 :
      this.combo >= COMBO_X2 ? 1 : 0;

    this.comboMultiplier = tier === 0 ? 1 : tier + 1;

    if (tier > 0) {
      this.comboHUD.setText(`×${this.comboMultiplier} COMBO`);
      const colors = ['', '#ffcc00', '#ff8800', '#ff00ff', '#00ffff'];
      this.comboHUD.setStyle({ color: colors[tier] });
    } else {
      this.comboHUD.setText('');
    }

    if (tier > this.lastComboTier) {
      this.lastComboTier = tier;
      playCombo(tier);
      this._showPopupText(`×${this.comboMultiplier} COMBO!`, '#ffcc00');
    }
  }

  /* --------------------------------------------------------
     POPUP TEXT
  -------------------------------------------------------- */
  private _showPopupText(text: string, color: string) {
    const W = GAME_WIDTH;
    const x = Phaser.Math.Between(W * 0.25, W * 0.75);
    const y = PLAYER_START_Y - 30;
    const t = this.add.text(x, y, text, {
      fontSize: '15px', fontFamily: 'monospace', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t, y: y - 50, alpha: 0,
      duration: 800, ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  /* --------------------------------------------------------
     POWER-UP HUD UPDATE
  -------------------------------------------------------- */
  private _updatePowerUpHUD(now: number) {
    if (now < this.doubleUntil) {
      const secs = ((this.doubleUntil - now) / 1000).toFixed(1);
      this.doubleTimerTxt.setText(`×2 DOUBLE ${secs}s`);
    } else {
      this.doubleTimerTxt.setText('');
    }

    /* i-frame flash: player blinks when passing through obstacle */
    if (this.time.now < this.invincibleUntil) {
      const blink = Math.sin(this.time.now * 0.04) > 0;
      this.player.setAlpha(blink ? 1 : 0.25);
    } else {
      this.player.setAlpha(1);
    }

    this.shieldIcon.setText(this.shieldActive ? '[ SHIELD ]' : '');
  }

  /* --------------------------------------------------------
     COLLISION — shield absorbs first hit
  -------------------------------------------------------- */
  private _checkCollision(): boolean {
    /* Skip during invincibility frames (after shield break) */
    if (this.time.now < this.invincibleUntil) return false;

    const px = this.player.x, py = this.player.y, pr = PLAYER_SIZE * 0.75;

    for (const obs of this.obstacles) {

      const bx = obs.body.x, by = obs.body.y;
      const hw = obs.body.displayWidth / 2, hh = obs.body.displayHeight / 2;
      const nearX = Phaser.Math.Clamp(px, bx - hw, bx + hw);
      const nearY = Phaser.Math.Clamp(py, by - hh, by + hh);
      const dx = px - nearX, dy = py - nearY;
      if (dx * dx + dy * dy <= pr * pr) return true;
    }
    return false;
  }

  /* --------------------------------------------------------
     DEATH
  -------------------------------------------------------- */
  private _onDeath() {
    this.alive = false;
    stopAmbient();

    /* Reset combo on death */
    this.combo = 0;
    this.comboMultiplier = 1;

    playHit();
    this.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY);

    /* Save high score */
    const finalScore = Math.floor(this.score);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem(STORAGE_HIGHSCORE, String(finalScore));
    }

    /* Save stats */
    const gamesPlayed = parseInt(localStorage.getItem(STORAGE_GAMES_PLAYED) || '0', 10) + 1;
    localStorage.setItem(STORAGE_GAMES_PLAYED, String(gamesPlayed));

    const totalTime = parseFloat(localStorage.getItem(STORAGE_TOTAL_TIME) || '0') + this.elapsedTime;
    localStorage.setItem(STORAGE_TOTAL_TIME, String(totalTime.toFixed(1)));

    const prevMax = parseInt(localStorage.getItem(STORAGE_MAX_COMBO) || '0', 10);
    if (this.maxCombo > prevMax) {
      localStorage.setItem(STORAGE_MAX_COMBO, String(this.maxCombo));
    }

    /* Shrink & fade player */
    this.tweens.add({
      targets: this.player,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 400,
    });

    /* Explosion particles */
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2;
      const spd = Phaser.Math.Between(60, 220);
      const ex = this.player.x, ey = this.player.y;
      const dot = this.add.circle(ex, ey, Phaser.Math.Between(2, 5), this.playerColor, 1);
      this.tweens.add({
        targets: dot,
        x: ex + Math.cos(angle) * spd,
        y: ey + Math.sin(angle) * spd,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(300, 650),
        ease: 'Power2',
        onComplete: () => dot.destroy(),
      });
    }

    this.time.delayedCall(900, () => {
      this.scene.start('GameOverScene', {
        score: Math.floor(this.score),
        best: this.highScore,
        skin: this.skinIndex,
        level: this.currentLevel + 1,
        maxCombo: this.maxCombo,
        elapsedTime: Math.floor(this.elapsedTime),
      });
    });
  }

  /* --------------------------------------------------------
     TRAIL PARTICLES
  -------------------------------------------------------- */
  private _emitTrail(time: number) {
    /* Emit from the nozzle area (bottom of rocket PNG, +21 px below centre) */
    const flameColors = [this.playerColor, 0xffffff, 0xff8800, 0xffff00];
    const col = flameColors[Math.floor(Math.random() * flameColors.length)];
    const dot = this.add.circle(
      this.player.x + Phaser.Math.Between(-4, 4),
      this.player.y + 21 + Phaser.Math.Between(0, 6),
      Phaser.Math.Between(2, 4),
      col,
      0.75,
    );
    dot.setDepth(8);
    this.trailParticles.push({ circle: dot, born: time, lifetime: TRAIL_PARTICLE_LIFETIME });
  }

  private _updateTrail(time: number) {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      const age = time - p.born;
      if (age >= p.lifetime) {
        p.circle.destroy();
        this.trailParticles.splice(i, 1);
      } else {
        const t = age / p.lifetime;
        p.circle.setAlpha(0.7 * (1 - t));
        p.circle.setScale(1 - t * 0.6);
      }
    }
  }

  /* --------------------------------------------------------
     SCROLLING STARS
  -------------------------------------------------------- */
  private _createScrollingStars() {
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const r = Math.random() * 1.2 + 0.2;
      const alpha = Math.random() * 0.4 + 0.05;
      const star = this.add.circle(x, y, r, 0xffffff, alpha);
      this.stars.push(star);
      /* base scroll speed 20–60 px/s */
      this.starSpeeds.push(20 + Math.random() * 40);
    }
  }

  private _updateScrollingStars(dt: number) {
    /* Stars mirror obstacle speed: 130 px/s → 1×,  508 px/s → 3× */
    const t = (this._lerpNum('scrollSpeed') - 130) / (508 - 130);
    const speedMult = 1 + t * 2.0;
    for (let i = 0; i < this.stars.length; i++) {
      this.stars[i].y += this.starSpeeds[i] * speedMult * dt;
      if (this.stars[i].y > GAME_HEIGHT + 4) {
        this.stars[i].y = -4;
        this.stars[i].x = Phaser.Math.Between(0, GAME_WIDTH);
      }
    }
  }

  private _createGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x001122, 0.3);
    for (let x = 0; x <= GAME_WIDTH; x += 40) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += 40) g.lineBetween(0, y, GAME_WIDTH, y);
  }

  /* --------------------------------------------------------
     ROCKET PLAYER BUILDER
     Draws a neon space-rocket pointing upward.
     The container's (0,0) is the centre / collision point.

     Dimensions (relative to centre):
       Nose tip  :  y = -18
       Body      :  x ±6,   y -8 → +8
       Fins      :  x ±6→±14, y +2 → +10
       Nozzle    :  x ±4,   y +8 → +13

     Total height ≈ 31 px, width with fins ≈ 28 px.
     Hitbox radius (PLAYER_SIZE = 13) stays unchanged.
  -------------------------------------------------------- */
  private _buildRocket(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const img = this.add.image(0, 0, 'player-rocket')
      .setDisplaySize(38, 42)
      .setTint(color);
    const container = this.add.container(x, y, [img]);
    return container;
  }
}
