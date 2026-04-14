
/* =========================================================
   GAME SCENE  —  800×1400 HD resolution
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
  NEAR_MISS_DISTANCE, NEAR_MISS_WAVE_BONUS, BASE_WAVE_BONUS,
  POWERUP_SIZE, POWERUP_SPAWN_CHANCE, POWERUP_DOUBLE_DURATION,
  POWERUP_SHRINK_DURATION, POWERUP_SHRINK_SCALE, COLOR_SHRINK,
} from '../constants';
import { t } from '../i18n';
import {
  getSocket, disconnectSocket, sendPosThrottled, roomState, colorHex,
} from '../multiState';
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
  body?: Phaser.GameObjects.Rectangle; /* double türü için yok */
  icon: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  type: 'shield' | 'double' | 'shrink';
  collected: boolean;
}

interface TrailParticle {
  circle: Phaser.GameObjects.Arc;
  born: number;
  lifetime: number;
  vx: number;
  vy: number;
  startRadius: number;
  maxAlpha: number;
}

export class GameScene extends Phaser.Scene {
  /* Player */
  private player!: Phaser.GameObjects.Container;
  private playerColor!: number;
  private dirX = 1;
  private playerVX = 0;

  /* Shield — 0/1/2 stack */
  private shieldCount = 0;
  private invincibleUntil = 0;
  private shieldRing!:  Phaser.GameObjects.Arc;  /* 1. kalkan halkası */
  private shieldRing2!: Phaser.GameObjects.Arc;  /* 2. kalkan dış halkası */
  private shieldGlow!:  Phaser.GameObjects.Arc;
  /* Sol HUD kalkan ikonu */
  private shieldHudIcon!:  Phaser.GameObjects.Image;
  private shieldHudCount!: Phaser.GameObjects.Text;

  /* Obstacles */
  private obstacles: Obstacle[] = [];
  private spawnTimer = 0;
  private waveCounter = 0;
  private lastGapCenter = -1;
  private passedWaveIds    = new Set<number>();
  private nearMissWaveIds  = new Set<number>(); /* bu wave'de near-miss olan waveId'ler */

  /* Power-ups */
  private powerUps: PowerUp[] = [];
  private doubleUntil = 0;
  private shrinkUntil = 0;
  private shrinkActive = false;

  /* Power-up HUD */
  private doubleTimerTxt!: Phaser.GameObjects.Text;
  private shrinkTimerTxt!: Phaser.GameObjects.Text;

  /* Trail */
  private trailParticles: TrailParticle[] = [];
  private lastTrailTime = 0;

  /* Stars (scrolling) */
  private stars: Phaser.GameObjects.Arc[] = [];
  private starSpeeds: number[] = [];

  /* Background planets */
  private bgPlanets: { img: Phaser.GameObjects.Image; speed: number }[] = [];
  private nextPlanetTime = 0;
  private lastPlanetKey = '';

  /* Score / time */
  private score = 0;
  private scoreDisplay = 0;
  private elapsedTime = 0;
  private scoreTxt!: Phaser.GameObjects.Text;
  private highScore = 0;

  /* Power-up cooldown */
  private lastPowerUpTime = -99999;

  /* Pause */
  private paused = false;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pausePanel!: Phaser.GameObjects.Container;
  private pauseBtn!: Phaser.GameObjects.Image;
  private soundToggleLabel!: Phaser.GameObjects.Text;

  /* Combo */
  private combo = 0;
  private maxCombo = 0;
  private comboMultiplier = 1;
  private comboHUD!: Phaser.GameObjects.Text;
  private comboProgressHUD!: Phaser.GameObjects.Text;
  private lastComboTier = 0;

  /* Level system */
  private currentLevel = 0;
  private levelDef!: LevelDef;
  private levelTxt!: Phaser.GameObjects.Text;
  private levelBannerContainer!: Phaser.GameObjects.Container;
  private levelProgressBg!: Phaser.GameObjects.Rectangle;
  private levelProgressFill!: Phaser.GameObjects.Rectangle;
  private levelProgressColor = 0xff2060;

  /* State */
  private alive = true;
  private lastTapTime = 0;
  private skinIndex = 0;

  constructor() { super({ key: 'GameScene' }); }

  /* Revive verisi — reklam sonrası kaldığı yerden devam */
  private reviveData: {
    active: boolean;
    score: number;
    level: number;
    elapsedTime: number;
    maxCombo: number;
  } = { active: false, score: 0, level: 0, elapsedTime: 0, maxCombo: 0 };

  /* ── Multiplayer ── */
  private multiMode = false;
  private multiCode = '';
  private multiDots = new Map<string, {
    dot:  Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
  }>();
  private multiWaitOverlay!: Phaser.GameObjects.Container;
  private multiWaitTxt!:     Phaser.GameObjects.Text;
  private countdownActive = false;

  init(data: {
    skin?: number; revive?: boolean; score?: number;
    level?: number; elapsedTime?: number; maxCombo?: number;
    multi?: boolean; myId?: string; myColor?: number; code?: string;
  }) {
    this.skinIndex = data?.skin ?? 0;
    this.playerColor = SKINS[this.skinIndex].color;
    this.reviveData = {
      active:      data?.revive ?? false,
      score:       data?.score ?? 0,
      level:       data?.level ?? 0,
      elapsedTime: data?.elapsedTime ?? 0,
      maxCombo:    data?.maxCombo ?? 0,
    };
    this.multiMode = data?.multi ?? false;
    this.multiCode = data?.code ?? '';
    if (this.multiMode) {
      roomState.myId    = data?.myId ?? '';
      roomState.myColor = data?.myColor ?? 0x00ffff;
    }
  }

  /* ── Smooth interpolation ── */
  private get _lvlRawT(): number {
    const t = (this.elapsedTime - this.currentLevel * LEVEL_DURATION) / LEVEL_DURATION;
    return Math.max(0, Math.min(1, t));
  }

  private get _lvlEasedT(): number {
    const t = this._lvlRawT;
    return t * t * (3 - 2 * t);
  }

  private _lerpNum(key: 'scrollSpeed' | 'spawnMs' | 'gapMin' | 'gapMax' | 'playerSpeedMult'): number {
    const next = Math.min(this.currentLevel + 1, LEVELS.length - 1);
    const a = LEVELS[this.currentLevel][key] as number;
    const b = LEVELS[next][key] as number;
    return a + (b - a) * this._lvlEasedT;
  }

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

  /* --------------------------------------------------------
     CREATE
  -------------------------------------------------------- */
  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    initSound();

    /* Background */
    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);
    this._createScrollingStars();
    this.bgPlanets = [];
    this.nextPlanetTime = this.time.now + Phaser.Math.Between(8000, 15000);

    /* Shield glow + iç halka + dış halka (2. kalkan için) */
    this.shieldGlow  = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE + 38, COLOR_SHIELD, 0).setDepth(8);
    this.shieldRing  = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE + 24, COLOR_SHIELD, 0).setDepth(9);
    this.shieldRing.setStrokeStyle(6, COLOR_SHIELD, 0);
    this.shieldRing2 = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE + 44, COLOR_SHIELD, 0).setDepth(8);
    this.shieldRing2.setStrokeStyle(3, COLOR_SHIELD, 0);

    /* Player */
    this.player = this._buildRocket(PLAYER_START_X, PLAYER_START_Y, this.playerColor);
    this.player.setDepth(10);

    /* HUD — score (center top) */
    this.scoreTxt = this.add.text(W / 2, 56, '0', {
      fontSize: '52px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#00ffff', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    /* HUD — best (bottom right) */
    this.highScore = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    this.add.text(W - 24, H - 28, `${t().best}: ${this.highScore}`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#334455',
    }).setOrigin(1, 1).setDepth(20);

    /* HUD — level (top left) */
    this.levelTxt = this.add.text(24, 28, `${t().lvl} 1`, {
      fontSize: '26px', fontFamily: 'monospace', color: '#ff2060',
    }).setOrigin(0, 0).setDepth(20);

    /* HUD — level progress bar */
    this.levelProgressBg   = this.add.rectangle(24, 60, 112, 6, 0x112233, 1).setOrigin(0, 0).setDepth(20);
    this.levelProgressFill = this.add.rectangle(24, 60, 4, 6, 0xff2060, 1).setOrigin(0, 0).setDepth(21);

    /* HUD — combo (level'ın altında, sol, küçük) */
    this.comboHUD = this.add.text(24, 82, '◦ YAKIN GEÇ → ×2', {
      fontSize: '20px', fontFamily: 'monospace', color: '#224433',
    }).setOrigin(0, 0).setDepth(22);

    this.comboProgressHUD = this.add.text(24, 108, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#446655',
    }).setOrigin(0, 0).setDepth(22);

    /* HUD — sol kenarda kalkan ikonu */
    this.shieldHudIcon = this.add.image(36, 196, 'icon-shield')
      .setDisplaySize(72, 72)
      .setDepth(22)
      .setAlpha(0.18);  /* başta soluk */

    this.shieldHudCount = this.add.text(36, 238, '', {
      fontSize: '24px', fontFamily: 'monospace', color: '#00ddff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(22);

    /* HUD — power-up timers */
    this.doubleTimerTxt = this.add.text(W / 2, 100, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffcc00',
      stroke: '#885500', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    this.shrinkTimerTxt = this.add.text(W / 2, 130, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ddaa00',
      stroke: '#665500', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    /* Level-up banner container */
    this.levelBannerContainer = this.add.container(W / 2, H / 2);
    this.levelBannerContainer.setDepth(30);
    this.levelBannerContainer.setAlpha(0);

    /* Pause button */
    this.pauseBtn = this.add.image(W - 28, 28, 'icon-menu')
      .setOrigin(1, 0)
      .setDisplaySize(44, 44)
      .setTint(0xaabbcc)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerover', () => this.pauseBtn.setTint(0xffffff));
    this.pauseBtn.on('pointerout',  () => this.pauseBtn.setTint(0xaabbcc));
    this.pauseBtn.on('pointerdown', () => this._togglePause());

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
    this.elapsedTime = 0;
    this.spawnTimer = 0;
    this.lastGapCenter = -1;
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
    this.nearMissWaveIds.clear();
    this.shieldCount = 0;
    this.invincibleUntil = 0;
    this.doubleUntil = 0;
    this.shrinkUntil = 0;
    this.shrinkActive = false;

    /* ── Revive: reklam sonrası kaldığı yerden devam ── */
    if (this.reviveData.active) {
      this.score        = this.reviveData.score;
      this.scoreDisplay = this.reviveData.score;
      this.elapsedTime  = this.reviveData.elapsedTime;
      this.currentLevel = Math.max(0, Math.min(this.reviveData.level, LEVELS.length - 1));
      this.levelDef     = LEVELS[this.currentLevel];
      this.maxCombo     = this.reviveData.maxCombo;
      this.shieldCount  = 1; /* 1 kalkanla başla */
      /* 1.5 saniyelik dokunulmazlık (obstacle + duvar) */
      this.invincibleUntil = (this.time.now || 0) + 1500;
      /* Kısa "DEVAM" toast */
      this._showReviveToast();
    }
    this._updateShieldVisuals();

    this._updateLevelLabel();
    startAmbient(this.reviveData.active ? this.currentLevel : 0);

    /* Multiplayer başlatma */
    if (this.multiMode) {
      for (const p of roomState.players.values()) p.alive = true;
      this.multiDots = new Map();
      this._buildMultiOverlay();
      this._bindMultiSocket();
      this._startCountdown();
    }
  }

  /* --------------------------------------------------------
     MULTIPLAYER COUNTDOWN  (3 → 2 → 1 → GO!)
  -------------------------------------------------------- */
  private _startCountdown() {
    this.countdownActive = true;
    this.paused = true;

    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(90);
    const countTxt = this.add.text(W / 2, H / 2, '3', {
      fontSize: '140px',
      fontFamily: '"Orbitron", monospace',
      color: '#00ffff',
      stroke: '#003344',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(91);

    const steps = ['3', '2', '1', t().countdownGo];
    let step = 0;

    const tick = () => {
      if (step >= steps.length) {
        overlay.destroy();
        countTxt.destroy();
        this.countdownActive = false;
        this.paused = false;
        return;
      }

      const label = steps[step];
      const isGo = step === steps.length - 1;
      countTxt.setText(label);
      countTxt.setFontSize(isGo ? '100px' : '140px');
      countTxt.setColor(isGo ? '#00ff88' : '#00ffff');
      countTxt.setScale(1.6);
      countTxt.setAlpha(1);

      this.tweens.add({
        targets: countTxt,
        scaleX: 1, scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });

      if (isGo) {
        this.tweens.add({
          targets: [countTxt, overlay],
          alpha: 0,
          delay: 400,
          duration: 200,
          onComplete: () => {
            overlay.destroy();
            countTxt.destroy();
            this.countdownActive = false;
            this.paused = false;
          },
        });
      } else {
        step++;
        this.time.delayedCall(800, tick);
      }
    };

    tick();
  }

  /* --------------------------------------------------------
     TAP HANDLER
  -------------------------------------------------------- */
  private _onPointerDown(ptr: Phaser.Input.Pointer) {
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

    /* Level progression */
    const targetLevel = Math.min(
      Math.floor(this.elapsedTime / LEVEL_DURATION),
      LEVELS.length - 1,
    );
    if (targetLevel > this.currentLevel) {
      this.currentLevel = targetLevel;
      this.levelDef = LEVELS[this.currentLevel];
      this._onLevelUp();
    }

    /* Level progress bar */
    const barW = Math.max(4, 112 * this._lvlRawT);
    this.levelProgressFill.setDisplaySize(barW, 6);
    const barColor = this._lerpWallColor();
    this.levelProgressColor = barColor;
    this.levelProgressFill.setFillStyle(barColor, 1);
    this.levelTxt.setStyle({ color: '#' + barColor.toString(16).padStart(6, '0') });

    /* Score */
    const doubleActive = now < this.doubleUntil;
    const basePtsPerSec = (15 + this.currentLevel * 5) * 0.6;
    this.score += dt * basePtsPerSec * this.comboMultiplier * (doubleActive ? 2 : 1);
    const displayNow = Math.floor(this.score);
    if (displayNow !== this.scoreDisplay) {
      this.scoreDisplay = displayNow;
      this.scoreTxt.setText(`${displayNow}`);
    }

    /* Player horizontal movement */
    const px = this.player.x + this.playerVX * dt;
    const wallMargin = (this.shrinkActive ? PLAYER_SIZE * POWERUP_SHRINK_SCALE : PLAYER_SIZE) + 4;
    const hitWall = px < wallMargin || px > GAME_WIDTH - wallMargin;
    if (hitWall) {
      if (this.shieldCount > 0) {
        this._breakShield();
        this.dirX *= -1;
        this.playerVX = PLAYER_HORIZONTAL_SPEED * this._lerpNum('playerSpeedMult') * this.dirX;
      } else if (now < this.invincibleUntil) {
        /* Kalkan kırıldıktan sonraki invincible süresinde duvar bounce — ölüm yok */
        this.dirX *= -1;
        this.playerVX = PLAYER_HORIZONTAL_SPEED * this._lerpNum('playerSpeedMult') * this.dirX;
      } else {
        this._onDeath();
        return;
      }
    }
    const clamped = Phaser.Math.Clamp(px, wallMargin, GAME_WIDTH - wallMargin);
    this.player.x   = clamped;
    this.shieldRing.x  = clamped; this.shieldRing.y  = this.player.y;
    this.shieldRing2.x = clamped; this.shieldRing2.y = this.player.y;
    this.shieldGlow.x  = clamped; this.shieldGlow.y  = this.player.y;

    /* Scrolling stars */
    this._updateScrollingStars(dt);
    this._updateBgPlanets(dt);

    /* Spawn obstacles */
    this.spawnTimer += delta;
    if (this.spawnTimer >= this._lerpNum('spawnMs')) {
      this.spawnTimer = 0;
      this._spawnObstacle(time);
    }

    /* Move obstacles */
    this._updateObstacles(dt, time);

    /* Move power-ups */
    this._updatePowerUps(dt);

    /* Collision */
    if (this._checkCollision()) {
      if (this.shieldCount > 0) {
        this._breakShield();
      } else {
        this._onDeath();
        return;
      }
    }

    /* Trail */
    if (time - this.lastTrailTime > TRAIL_EMIT_INTERVAL) {
      this.lastTrailTime = time;
      this._emitTrail(time);
    }
    this._updateTrail(time, delta);

    /* Shield pulse animasyonu */
    if (this.shieldCount > 0) {
      const pulse = 0.25 + 0.15 * Math.sin(time * 0.012);
      this.shieldRing.setStrokeStyle(6, COLOR_SHIELD, pulse + 0.5);
      this.shieldGlow.setAlpha(pulse * 0.8);
      if (this.shieldCount >= 2) {
        /* 2. kalkan: dış halka — ters fazda titrer */
        const pulse2 = 0.2 + 0.15 * Math.sin(time * 0.012 + Math.PI);
        this.shieldRing2.setStrokeStyle(3, COLOR_SHIELD, pulse2 + 0.3);
      }
    }

    /* Power-up timer HUD */
    this._updatePowerUpHUD(now);

    /* Multiplayer: pozisyon gönder + diğer dotları güncelle */
    if (this.multiMode) {
      sendPosThrottled(this.player.x, this.player.y, this.score);
    }
  }

  /* --------------------------------------------------------
     LEVEL UP
  -------------------------------------------------------- */
  private _onLevelUp() {
    this._updateLevelLabel();
    playScore(this.currentLevel);
    updateAmbientLevel(this.currentLevel);

    const W = GAME_WIDTH;
    const CX = W / 2;
    const def = this.levelDef;
    const col = def.wallColor;
    const hex = '#' + col.toString(16).padStart(6, '0');
    const isZone = !!def.zone;

    /* Küçük badge — ekranın üst kısmından süzülür, sessizce kaybolur */
    this.levelBannerContainer.removeAll(true);
    this.levelBannerContainer.setAlpha(0).setScale(1);

    const badgeY = 148;
    this.levelBannerContainer.setPosition(CX, badgeY - 20);

    /* Arka plan hap */
    const padX = isZone ? 52 : 40;
    const padY = isZone ? 36 : 28;
    const bg = this.add.rectangle(0, 0, 0, padY * 2, 0x050510, 0.88)
      .setStrokeStyle(1.5, col, 0.7);
    this.levelBannerContainer.add(bg);

    /* Seviye adı */
    const lvlTxt = this.add.text(0, isZone ? -10 : 0, def.label, {
      fontSize: isZone ? '26px' : '28px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: hex,
    }).setOrigin(0.5);
    this.levelBannerContainer.add(lvlTxt);

    /* Zone adı (sadece zone geçişlerinde) */
    if (isZone && def.zone) {
      const zoneTxt = this.add.text(0, 13, def.zone, {
        fontSize: '13px', fontFamily: 'monospace',
        color: '#667788', letterSpacing: 3,
      }).setOrigin(0.5);
      this.levelBannerContainer.add(zoneTxt);
    }

    /* Badge genişliği içeriğe göre */
    bg.setSize(lvlTxt.width + padX * 2, padY * 2);

    /* Giriş: aşağı süzül + belir */
    this.tweens.add({
      targets: this.levelBannerContainer,
      alpha: 1,
      y: badgeY,
      duration: 200,
      ease: 'Cubic.Out',
      onComplete: () => {
        /* Bekle → çık */
        this.time.delayedCall(isZone ? 1100 : 750, () => {
          this.tweens.add({
            targets: this.levelBannerContainer,
            alpha: 0,
            y: badgeY - 14,
            duration: 220,
            ease: 'Cubic.In',
          });
        });
      },
    });
  }

  private _updateLevelLabel() {
    this.levelTxt.setText(`${t().lvl} ${this.currentLevel + 1}`);
  }

  /* --------------------------------------------------------
     OBSTACLE SPAWNING
  -------------------------------------------------------- */
  private _spawnObstacle(_time: number) {
    const W = GAME_WIDTH;
    const waveId = ++this.waveCounter;
    const y = -40;

    const gMin = Math.round(this._lerpNum('gapMin'));
    const gMax = Math.round(this._lerpNum('gapMax'));
    const gapSize = Phaser.Math.Between(gMin, gMax);

    /* Gap drift limiti: bir sonraki boşluk, oyuncunun erişebileceğinden
       fazla uzakta spawnlanamaz. maxDrift = hız × spawn_aralığı × 0.85 */
    const playerSpeed = PLAYER_HORIZONTAL_SPEED * this._lerpNum('playerSpeedMult');
    const maxDrift    = playerSpeed * (this._lerpNum('spawnMs') / 1000) * 0.85;
    const margin      = PLAYER_SIZE * 2;
    const halfGap     = gapSize / 2;

    let gapCenter: number;
    if (this.lastGapCenter < 0) {
      gapCenter = Phaser.Math.Between(margin + halfGap, W - margin - halfGap);
    } else {
      const minC = Math.max(margin + halfGap,     this.lastGapCenter - maxDrift);
      const maxC = Math.min(W - margin - halfGap, this.lastGapCenter + maxDrift);
      gapCenter = Phaser.Math.Between(Math.round(minC), Math.round(maxC));
    }
    this.lastGapCenter = gapCenter;
    const gapX = Math.round(gapCenter - halfGap);
    const wc = this._lerpWallColor();

    const leftW = gapX;
    const left = this.add.rectangle(leftW / 2, y, leftW, OBSTACLE_THICKNESS, wc, 1).setDepth(3);

    const rightW = W - gapX - gapSize;
    const rightX = gapX + gapSize + rightW / 2;
    const right = this.add.rectangle(rightX, y, rightW, OBSTACLE_THICKNESS, wc, 1).setDepth(3);

    this.obstacles.push(
      { body: left,  isLaser: false, waveId },
      { body: right, isLaser: false, waveId },
    );

    /* Maybe spawn a power-up */
    const sinceLastPowerUp = this.elapsedTime * 1000 - this.lastPowerUpTime;
    if (
      this.powerUps.length === 0 &&
      sinceLastPowerUp >= 6000 &&
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
    let type: 'shield' | 'double' | 'shrink';
    const roll = Math.random();
    if (roll < 0.08) {
      type = 'shrink';
    } else if (this.shieldCount >= 2) {
      type = 'double';
    } else if (this.shieldCount === 1) {
      type = Math.random() < 0.09 ? 'shield' : 'double';
    } else {
      type = Math.random() < 0.20 ? 'shield' : 'double';
    }

    const colorMap: Record<string, number> = { shield: COLOR_SHIELD, double: COLOR_DOUBLE, shrink: COLOR_SHRINK };
    const color = colorMap[type];

    const bw = 88, bh = 88;
    const x = Phaser.Math.Between(bw / 2 + 20, W - bw / 2 - 20);
    const y = -bh - 20;

    const ring = this.add.circle(x, y, bw * 0.75, color, 0.12);
    ring.setDepth(5);

    this.tweens.add({
      targets: ring,
      scaleX: 1.6, scaleY: 1.6, alpha: 0,
      duration: 800, repeat: -1, ease: 'Sine.easeOut',
    });

    const iconKeyMap: Record<string, string> = { shield: 'icon-shield', double: 'icon-double', shrink: 'icon-shrink' };
    const iconKey = iconKeyMap[type];
    const icon = this.add.image(x, y, iconKey)
      .setDisplaySize(96, 96)
      .setDepth(7);

    this.powerUps.push({ icon, ring, type, collected: false });
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

      if (pu.body) pu.body.y += speed * dt;
      pu.icon.y += speed * dt;
      pu.ring.y  += speed * dt;

      /* Çarpışma tespiti: her zaman mevcut olan icon konumunu kullan */
      const dx = this.player.x - pu.icon.x;
      const dy = this.player.y - pu.icon.y;
      if (dx * dx + dy * dy < (PLAYER_SIZE + POWERUP_SIZE) * (PLAYER_SIZE + POWERUP_SIZE)) {
        this._collectPowerUp(pu);
        toRemove.push(i);
        continue;
      }

      if (pu.icon.y > GAME_HEIGHT + 80) {
        pu.body?.destroy(); pu.icon.destroy(); pu.ring.destroy();
        toRemove.push(i);
      }
    }
    toRemove.forEach(i => this.powerUps.splice(i, 1));
  }

  private _collectPowerUp(pu: PowerUp) {
    pu.collected = true;
    playPowerUp(pu.type);

    const colorMap: Record<string, number> = { shield: COLOR_SHIELD, double: COLOR_DOUBLE, shrink: COLOR_SHRINK };
    const c = colorMap[pu.type];
    const flash = this.add.circle(pu.icon.x, pu.icon.y, POWERUP_SIZE * 2.5, c, 0.6).setDepth(15);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 280, onComplete: () => flash.destroy() });

    pu.body?.destroy(); pu.icon.destroy(); pu.ring.destroy();

    if (pu.type === 'shield') {
      this.shieldCount = Math.min(this.shieldCount + 1, 2);
      this._updateShieldVisuals();
    } else if (pu.type === 'double') {
      this.doubleUntil = this.time.now + POWERUP_DOUBLE_DURATION;
    } else if (pu.type === 'shrink') {
      this.shrinkUntil = this.time.now + POWERUP_SHRINK_DURATION;
      if (!this.shrinkActive) {
        this.shrinkActive = true;
        this.tweens.add({
          targets: this.player,
          scaleX: POWERUP_SHRINK_SCALE,
          scaleY: POWERUP_SHRINK_SCALE,
          duration: 200,
          ease: 'Back.easeOut',
        });
      }
    }

    const popupMap: Record<string, string> = { shield: '🛡 SHIELD!', double: '×2 DOUBLE!', shrink: '🔻 SHRINK!' };
    this._showPopupText(
      popupMap[pu.type],
      '#' + c.toString(16).padStart(6, '0'),
    );
  }

  /* --------------------------------------------------------
     SHIELD BREAK
  -------------------------------------------------------- */
  private _breakShield() {
    this.shieldCount = Math.max(this.shieldCount - 1, 0);
    this.invincibleUntil = this.time.now + 900;
    playShieldHit();
    this.cameras.main.shake(200, 0.010);
    this._updateShieldVisuals();

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const spd = Phaser.Math.Between(100, 260);
      const px = this.player.x, py = this.player.y;
      const shard = this.add.circle(px, py, Phaser.Math.Between(4, 8), COLOR_SHIELD, 0.9).setDepth(15);
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
     SHIELD — görsel güncelleme (HUD + halka + glow)
  -------------------------------------------------------- */
  private _updateShieldVisuals() {
    if (this.shieldCount === 0) {
      this.shieldRing.setStrokeStyle(6, COLOR_SHIELD, 0);
      this.shieldRing2.setStrokeStyle(3, COLOR_SHIELD, 0);
      this.shieldGlow.setAlpha(0);
    } else {
      /* İç halka: her zaman aktif */
      this.shieldRing.setStrokeStyle(6, COLOR_SHIELD, 0.7);
      this.shieldGlow.setAlpha(0.2);
      /* Dış halka: yalnızca 2. kalkan */
      if (this.shieldCount >= 2) {
        this.shieldRing2.setStrokeStyle(3, COLOR_SHIELD, 0.5);
      } else {
        this.shieldRing2.setStrokeStyle(3, COLOR_SHIELD, 0);
      }
    }
    this._updateShieldHUD();
  }

  private _updateShieldHUD() {
    switch (this.shieldCount) {
      case 0:
        this.shieldHudIcon.setAlpha(0.15);
        this.shieldHudCount.setText('');
        break;
      case 1:
        this.shieldHudIcon.setAlpha(1);
        this.shieldHudCount.setText('');
        break;
      case 2:
        this.shieldHudIcon.setAlpha(1);
        this.shieldHudCount.setText('×2');
        break;
    }
  }

  /* --------------------------------------------------------
     OBSTACLE UPDATE — near-miss + combo
  -------------------------------------------------------- */
  private _updateObstacles(dt: number, time: number) {
    const speed     = this._lerpNum('scrollSpeed');
    const liveColor = this._lerpWallColor();
    const toRemove: number[] = [];

    /* ── Aşama 1: hareket + near-miss tespiti ── */
    const justPassedWaves = new Set<number>();

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.body.y += speed * dt;
      obs.body.setFillStyle(liveColor, 1);

      if (!obs.passed && obs.body.y > PLAYER_START_Y) {
        obs.passed = true;

        /* Near-miss kontrolü — SADECE dolu pillar (laser değil) */
        if (!obs.isLaser) {
          const nearX = Phaser.Math.Clamp(
            this.player.x,
            obs.body.x - obs.body.displayWidth / 2,
            obs.body.x + obs.body.displayWidth / 2,
          );
          const distX = Math.abs(this.player.x - nearX);
          if (distX > 0 && distX < NEAR_MISS_DISTANCE) {
            this.nearMissWaveIds.add(obs.waveId);
          }
        }

        justPassedWaves.add(obs.waveId);
      }

      if (obs.body.y > GAME_HEIGHT + 80) {
        obs.body.destroy();
        toRemove.push(i);
      }
    }

    /* ── Aşama 2: wave başına combo kararı ── */
    const dbl = this.time.now < this.doubleUntil;

    for (const waveId of justPassedWaves) {
      if (this.passedWaveIds.has(waveId)) continue;
      this.passedWaveIds.add(waveId);

      const isNearMiss = this.nearMissWaveIds.has(waveId);

      if (isNearMiss) {
        /* Yakın geçiş → combo artır */
        playNearMiss();
        this._incrementCombo();
        const bonus = NEAR_MISS_WAVE_BONUS * this.comboMultiplier * (dbl ? 2 : 1);
        this.score += bonus;
        this.scoreDisplay = Math.floor(this.score);
        this.scoreTxt.setText(`${this.scoreDisplay}`);
        const comboTag = this.comboMultiplier > 1 ? ` ×${this.comboMultiplier}` : '';
        const col = dbl ? '#ffcc00' : (this.comboMultiplier > 1 ? '#ff8800' : '#ff6600');
        this._showPopupText(`+${bonus} YAKIN!${comboTag}`, col);
      } else {
        /* Güvenli geçiş → combo sıfırla */
        const hadCombo = this.combo > 0;
        this._resetCombo();
        const bonus = BASE_WAVE_BONUS * (dbl ? 2 : 1);
        this.score += bonus;
        this.scoreDisplay = Math.floor(this.score);
        this.scoreTxt.setText(`${this.scoreDisplay}`);
        if (hadCombo) {
          this._showPopupText(`+${bonus} combo bozuldu`, '#446655');
        } else {
          this._showPopupText(`+${bonus}`, '#00ffcc');
        }
      }
    }

    toRemove.forEach(i => this.obstacles.splice(i, 1));
    void time;
  }

  /* --------------------------------------------------------
     PAUSE PANEL
  -------------------------------------------------------- */
  private _buildPausePanel() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    this.pauseOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72)
      .setDepth(79).setVisible(false);

    this.pausePanel = this.add.container(W / 2, H / 2).setDepth(80).setVisible(false);

    const PW = 460, PH = 480;

    const bg = this.add.rectangle(0, 0, PW, PH, 0x080820, 1);
    const border = this.add.rectangle(0, 0, PW, PH).setStrokeStyle(3, 0x00ffff, 0.7);
    border.setFillStyle(0x000000, 0);

    const title = this.add.text(0, -PH / 2 + 52, t().paused, {
      fontSize: '44px', fontFamily: 'monospace',
      color: '#050510', stroke: '#00ffff', strokeThickness: 4,
    }).setOrigin(0.5);

    const makeBtn = (y: number, label: string, color: number, textColor: string) => {
      const BW = 340, BH = 72;
      const btnBg = this.add.rectangle(0, y, BW, BH, color, 0.15);
      const btnBorder = this.add.rectangle(0, y, BW, BH).setStrokeStyle(2, color, 0.8);
      btnBorder.setFillStyle(0x000000, 0);
      const btnTxt = this.add.text(0, y, label, {
        fontSize: '26px', fontFamily: 'monospace', color: textColor,
      }).setOrigin(0.5);
      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on('pointerover', () => btnBg.setAlpha(0.35));
      btnBg.on('pointerout',  () => btnBg.setAlpha(0.15));
      return { btnBg, btnBorder, btnTxt };
    };

    const resume = makeBtn(-76, t().resume, 0x00ffcc, '#00ffcc');
    resume.btnBg.on('pointerdown', () => this._togglePause());

    const soundLabel = isSoundEnabled() ? t().soundOn : t().soundOff;
    const sound = makeBtn(32, soundLabel, 0x4488ff, '#4488ff');
    this.soundToggleLabel = sound.btnTxt;
    sound.btnBg.on('pointerdown', () => {
      const next = !isSoundEnabled();
      setSoundEnabled(next);
      this.soundToggleLabel.setText(next ? t().soundOn : t().soundOff);
      if (next) startAmbient(this.currentLevel);
    });

    const menu = makeBtn(140, t().mainMenu, 0xff4477, '#ff4477');
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
    if (!this.alive || this.countdownActive) return;
    this.paused = !this.paused;

    if (this.paused) {
      stopAmbient();
      this.soundToggleLabel.setText(isSoundEnabled() ? t().soundOn : t().soundOff);
      this.pauseOverlay.setVisible(true);
      this.pausePanel.setVisible(true);
      this.pauseBtn.setTint(0x555566);
    } else {
      this.pauseOverlay.setVisible(false);
      this.pausePanel.setVisible(false);
      this.pauseBtn.setTint(0xaabbcc);
      if (isSoundEnabled()) startAmbient(this.currentLevel);
    }
  }

  /* --------------------------------------------------------
     COMBO — Near-Miss Streak
  -------------------------------------------------------- */
  private _updateComboHUD() {
    const tier =
      this.combo >= COMBO_X5 ? 4 :
      this.combo >= COMBO_X4 ? 3 :
      this.combo >= COMBO_X3 ? 2 :
      this.combo >= COMBO_X2 ? 1 : 0;

    const mult     = tier === 0 ? 1 : tier + 1;
    this.comboMultiplier = mult;

    const colors   = ['#33ff99', '#ffcc00', '#ff8800', '#ff44ff', '#00ffff'];
    const nextGoals = [COMBO_X2, COMBO_X2, COMBO_X3, COMBO_X4, COMBO_X5];
    const maxTier   = 4;

    if (this.combo === 0) {
      /* İpucu: hiç streak yok */
      this.comboHUD.setText('◦ YAKIN GEÇ → ×2');
      this.comboHUD.setStyle({ color: '#224433', fontSize: '18px' });
      this.comboProgressHUD.setText('');
    } else if (tier === 0) {
      /* 1. yakın geçiş — tier henüz açılmadı */
      const goal = nextGoals[0];
      this.comboHUD.setText(`◉ ${this.combo}/${goal} → ×2`);
      this.comboHUD.setStyle({ color: '#33ff99', fontSize: '18px' });
      this.comboProgressHUD.setText(this._dotBar(this.combo, goal));
      this.comboProgressHUD.setStyle({ color: '#33ff99' });
    } else if (tier < maxTier) {
      const goal = nextGoals[tier];
      this.comboHUD.setText(`×${this.comboMultiplier} COMBO`);
      this.comboHUD.setStyle({ color: colors[tier], fontSize: '22px' });
      this.comboProgressHUD.setText(this._dotBar(this.combo, goal));
      this.comboProgressHUD.setStyle({ color: colors[tier] });
    } else {
      /* MAX tier */
      this.comboHUD.setText(`×5 COMBO MAX!`);
      this.comboHUD.setStyle({ color: '#00ffff', fontSize: '22px' });
      this.comboProgressHUD.setText('● ● ● ● ●');
      this.comboProgressHUD.setStyle({ color: '#00ffff' });
    }

    return tier;
  }

  private _dotBar(current: number, goal: number): string {
    /* Renkli dairelerle ilerleme çubuğu: ● ● ● ◦ ◦ */
    const filled = Math.min(current, goal);
    return '● '.repeat(filled).trim() + (goal > filled ? '  ' + '◦ '.repeat(goal - filled).trim() : '');
  }

  private _incrementCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const prevTier = this.lastComboTier;
    const tier = this._updateComboHUD(); /* comboMultiplier _updateComboHUD içinde set ediliyor */

    /* Yeni tier'a geçince ses + büyük popup */
    if (tier > prevTier) {
      this.lastComboTier = tier;
      playCombo(tier);
      const colors = ['#33ff99', '#ffcc00', '#ff8800', '#ff44ff', '#00ffff'];
      this._showPopupText(`★ ×${this.comboMultiplier} COMBO! ★`, colors[tier], 40);
    }
  }

  private _resetCombo() {
    this.combo = 0;
    this.comboMultiplier = 1;
    this.lastComboTier = 0;
    this._updateComboHUD();
  }

  /* --------------------------------------------------------
     POPUP TEXT
  -------------------------------------------------------- */
  private _showPopupText(text: string, color: string, size = 32) {
    const W = GAME_WIDTH;
    const x = Phaser.Math.Between(W * 0.2, W * 0.8);
    const y = PLAYER_START_Y - 80;
    const t = this.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'monospace', color,
      stroke: '#000000', strokeThickness: size > 35 ? 6 : 4,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t, y: y - 120, alpha: 0,
      duration: 900, ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  private _showReviveToast() {
    const W = GAME_WIDTH;
    /* Arka panel */
    const bg = this.add.rectangle(W / 2, 148, 340, 52, 0x003322, 1)
      .setStrokeStyle(3, 0x44ffaa, 1)
      .setDepth(60)
      .setAlpha(0);
    /* Yazı */
    const lbl = this.add.text(W / 2, 148, '★  DEVAM  ★', {
      fontSize: '22px', fontFamily: '"Orbitron", monospace',
      color: '#44ffaa',
    }).setOrigin(0.5).setDepth(61).setAlpha(0);

    /* Belir → bekle → kaybol */
    this.tweens.add({
      targets: [bg, lbl], alpha: 1,
      duration: 200, ease: 'Power2',
      onComplete: () => {
        this.time.delayedCall(900, () => {
          this.tweens.add({
            targets: [bg, lbl], alpha: 0, y: '-=20',
            duration: 280, ease: 'Power2',
            onComplete: () => { bg.destroy(); lbl.destroy(); },
          });
        });
      },
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

    if (now < this.shrinkUntil) {
      const secs = ((this.shrinkUntil - now) / 1000).toFixed(1);
      this.shrinkTimerTxt.setText(`🔻 SHRINK ${secs}s`);
    } else {
      this.shrinkTimerTxt.setText('');
      if (this.shrinkActive) {
        this.shrinkActive = false;
        this.tweens.add({
          targets: this.player,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Back.easeOut',
        });
      }
    }

    if (this.time.now < this.invincibleUntil) {
      const blink = Math.sin(this.time.now * 0.04) > 0;
      this.player.setAlpha(blink ? 1 : 0.25);
    } else {
      this.player.setAlpha(1);
    }

    this._updateShieldHUD();
  }

  /* --------------------------------------------------------
     COLLISION
  -------------------------------------------------------- */
  private _checkCollision(): boolean {
    if (this.time.now < this.invincibleUntil) return false;

    const shrinkMult = this.shrinkActive ? POWERUP_SHRINK_SCALE : 1;
    const px = this.player.x, py = this.player.y, pr = PLAYER_SIZE * 0.75 * shrinkMult;

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

    this.combo = 0;
    this.comboMultiplier = 1;

    playHit();
    this.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY);

    const finalScore = Math.floor(this.score);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem(STORAGE_HIGHSCORE, String(finalScore));
    }

    const gamesPlayed = parseInt(localStorage.getItem(STORAGE_GAMES_PLAYED) || '0', 10) + 1;
    localStorage.setItem(STORAGE_GAMES_PLAYED, String(gamesPlayed));

    const totalTime = parseFloat(localStorage.getItem(STORAGE_TOTAL_TIME) || '0') + this.elapsedTime;
    localStorage.setItem(STORAGE_TOTAL_TIME, String(totalTime.toFixed(1)));

    const prevMax = parseInt(localStorage.getItem(STORAGE_MAX_COMBO) || '0', 10);
    if (this.maxCombo > prevMax) {
      localStorage.setItem(STORAGE_MAX_COMBO, String(this.maxCombo));
    }

    this.tweens.add({
      targets: this.player,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 400,
    });

    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2;
      const spd = Phaser.Math.Between(120, 440);
      const ex = this.player.x, ey = this.player.y;
      const dot = this.add.circle(ex, ey, Phaser.Math.Between(4, 10), this.playerColor, 1);
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
      if (this.multiMode) {
        /* Çok oyunculu: ölümü bildir, bekleme ekranı göster */
        getSocket().emit('player-dead', { score: Math.floor(this.score) });
        this._showMultiWaitOverlay();
      } else {
        this.scene.start('GameOverScene', {
          score: Math.floor(this.score),
          best: this.highScore,
          skin: this.skinIndex,
          level: this.currentLevel + 1,
          maxCombo: this.maxCombo,
          elapsedTime: Math.floor(this.elapsedTime),
          hasRevived: this.reviveData.active,
        });
      }
    });
  }

  /* --------------------------------------------------------
     TRAIL PARTICLES
  -------------------------------------------------------- */
  private _emitTrail(time: number) {
    /* 4-tier fire particle system:
       0 = white core  (tiny, fast, brief)
       1 = yellow flame (medium)
       2 = orange mid   (larger, slower)
       3 = red ember    (biggest, slowest, longest) */
    const tiers = [
      { col: 0xffffff, ba: 0.95, rMin: 2, rMax: 4,  vyMin: 55,  vyMax: 95,  vxR: 10, life: 190 },
      { col: 0xffee22, ba: 0.88, rMin: 4, rMax: 7,  vyMin: 85,  vyMax: 140, vxR: 22, life: 310 },
      { col: 0xff6600, ba: 0.72, rMin: 5, rMax: 9,  vyMin: 110, vyMax: 170, vxR: 34, life: 440 },
      { col: 0xcc1100, ba: 0.45, rMin: 6, rMax: 12, vyMin: 135, vyMax: 200, vxR: 46, life: 600 },
    ];

    const nx = this.player.x;
    const ny = this.player.y + 32; /* rocket nozzle — roketin alt iç kısmı */

    for (const tier of tiers) {
      const r  = Phaser.Math.Between(tier.rMin, tier.rMax);
      const vy = Phaser.Math.Between(tier.vyMin, tier.vyMax);
      const vx = Phaser.Math.FloatBetween(-tier.vxR, tier.vxR);
      const px = nx + Phaser.Math.FloatBetween(-5, 5);

      const dot = this.add.circle(px, ny, r, tier.col, tier.ba);
      dot.setDepth(8);
      this.trailParticles.push({
        circle: dot, born: time, lifetime: tier.life,
        vx, vy, startRadius: r, maxAlpha: tier.ba,
      });
    }
  }

  private _updateTrail(time: number, delta: number) {
    const dt = delta / 1000;
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      const age = time - p.born;
      if (age >= p.lifetime) {
        p.circle.destroy();
        this.trailParticles.splice(i, 1);
      } else {
        const t = age / p.lifetime; /* 0=fresh → 1=dying */

        /* Physics: drift downward + turbulence */
        p.circle.x += p.vx * dt;
        p.circle.y += p.vy * dt;

        /* Size: expand to peak at t≈0.3, then shrink */
        const sf = t < 0.3
          ? 1 + t * 0.9
          : 1.27 - ((t - 0.3) / 0.7) * 1.27;
        p.circle.setRadius(Math.max(0.5, p.startRadius * Math.max(0, sf)));

        /* Alpha: snap in → sustain → smooth fade out */
        const fadeIn  = Math.min(1, t / 0.08);
        const fadeOut = 1 - t;
        p.circle.setAlpha(p.maxAlpha * fadeIn * fadeOut);
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
      const r = Math.random() * 2.4 + 0.4;
      const alpha = Math.random() * 0.4 + 0.05;
      const star = this.add.circle(x, y, r, 0xffffff, alpha);
      this.stars.push(star);
      this.starSpeeds.push(40 + Math.random() * 80);
    }
  }

  private _updateScrollingStars(dt: number) {
    const t = (this._lerpNum('scrollSpeed') - 260) / (1016 - 260);
    const speedMult = 1 + t * 2.0;
    for (let i = 0; i < this.stars.length; i++) {
      this.stars[i].y += this.starSpeeds[i] * speedMult * dt;
      if (this.stars[i].y > GAME_HEIGHT + 4) {
        this.stars[i].y = -4;
        this.stars[i].x = Phaser.Math.Between(0, GAME_WIDTH);
      }
    }
  }

  private static readonly PLANET_KEYS = [
    'planet-1','planet-2','planet-3','planet-4','planet-5',
    'planet-6','planet-7','planet-8','planet-9','planet-10',
  ];

  private _updateBgPlanets(dt: number) {
    const now = this.time.now;
    if (now >= this.nextPlanetTime) {
      this._spawnBgPlanet();
      this.nextPlanetTime = now + Phaser.Math.Between(15000, 30000);
    }
    const t = (this._lerpNum('scrollSpeed') - 260) / (1016 - 260);
    const speedMult = 0.6 + t * 0.8;
    for (let i = this.bgPlanets.length - 1; i >= 0; i--) {
      const p = this.bgPlanets[i];
      p.img.y += p.speed * speedMult * dt;
      if (p.img.y > GAME_HEIGHT + 200) {
        p.img.destroy();
        this.bgPlanets.splice(i, 1);
      }
    }
  }

  private _spawnBgPlanet() {
    const keys = GameScene.PLANET_KEYS.filter(k => k !== this.lastPlanetKey);
    const key = keys[Phaser.Math.Between(0, keys.length - 1)];
    if (!this.textures.exists(key)) return;
    this.lastPlanetKey = key;
    const scale = 0.35 + Math.random() * 0.5;
    const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
    const speed = 80 + Math.random() * 60;
    const alpha = 0.10 + Math.random() * 0.15;
    const img = this.add.image(x, -180, key)
      .setScale(scale)
      .setAlpha(alpha)
      .setDepth(1);
    this.bgPlanets.push({ img, speed });
  }

  private _createGrid() {
    const g = this.add.graphics();
    g.lineStyle(2, 0x001122, 0.3);
    for (let x = 0; x <= GAME_WIDTH; x += 80) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += 80) g.lineBetween(0, y, GAME_WIDTH, y);
  }

  /* --------------------------------------------------------
     ROCKET PLAYER BUILDER
  -------------------------------------------------------- */
  private _buildRocket(x: number, y: number, _color: number): Phaser.GameObjects.Container {
    const img = this.add.image(0, 0, SKINS[this.skinIndex].key)
      .setDisplaySize(76, 84);
    const container = this.add.container(x, y, [img]);
    return container;
  }

  /* ========================================================
     MULTIPLAYER
  ======================================================== */

  private _buildMultiOverlay() {
    const W = GAME_WIDTH, H = GAME_HEIGHT, CX = W / 2;
    const bg = this.add.rectangle(CX, H / 2, W, H, 0x000008, 0.84).setDepth(50);
    const title = this.add.text(CX, H * 0.32, '⏳ DİĞERLERİ OYNUYOR...', {
      fontSize: '36px', fontFamily: 'Arial, sans-serif',
      color: '#00ffff',
    }).setOrigin(0.5).setDepth(51);

    this.multiWaitTxt = this.add.text(CX, H * 0.48, '', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
      align: 'center', lineSpacing: 12,
    }).setOrigin(0.5).setDepth(51);

    this.multiWaitOverlay = this.add.container(0, 0, [bg, title, this.multiWaitTxt]);
    this.multiWaitOverlay.setDepth(50).setVisible(false);
  }

  private _bindMultiSocket() {
    const s = getSocket();

    /* Diğer oyuncuların pozisyon güncellemeleri */
    s.on('player-pos', ({ id, x, y, score: _s }: any) => {
      if (id === roomState.myId) return;
      let entry = this.multiDots.get(id);
      /* Eski oyundan kalmış destroy edilmiş nesne varsa temizle */
      if (entry && !entry.dot.active) {
        this.multiDots.delete(id);
        entry = undefined;
      }
      if (!entry) {
        const player = roomState.players.get(id);
        const color = player?.color ?? 0xffffff;
        const dot = this.add.circle(x, y, 10, color, 0.85).setDepth(11);
        const name = player?.name?.slice(0, 3) ?? '???';
        const label = this.add.text(x, y - 22, name, {
          fontSize: '18px', fontFamily: 'monospace', color: colorHex(color),
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(12);
        entry = { dot, label };
        this.multiDots.set(id, entry);
      }
      entry.dot.setPosition(x, y);
      entry.label.setPosition(x, y - 22);
    });

    /* Bir oyuncu öldü */
    s.on('player-died', ({ id }: { id: string }) => {
      const rp = roomState.players.get(id);
      if (rp) rp.alive = false;
      const entry = this.multiDots.get(id);
      if (entry) {
        entry.dot.setAlpha(0.15);
        entry.label.setAlpha(0.3);
      }
      this._updateWaitText();
    });

    /* Oyun bitti — sonuçlara git */
    s.on('game-over', ({ results }: { results: any[] }) => {
      stopAmbient();
      this.time.delayedCall(400, () => {
        this.scene.start('MultiLobbyScene', {
          phase: 'results',
          results,
        });
      });
    });

    /* Bir oyuncu ayrıldı */
    s.on('player-left', ({ id }: { id: string }) => {
      roomState.players.delete(id);
      const entry = this.multiDots.get(id);
      if (entry) { entry.dot.destroy(); entry.label.destroy(); }
      this.multiDots.delete(id);
    });

    /* Host çıktı — oda yok edildi */
    s.on('room-destroyed', () => {
      stopAmbient();
      roomState.code = '';
      roomState.myId = '';
      roomState.players.clear();
      roomState.results = [];
      disconnectSocket();
      this.scene.start('StartScene');
    });
  }

  private _showMultiWaitOverlay() {
    if (this.multiWaitOverlay) {
      this.multiWaitOverlay.setVisible(true);
    }
    this._updateWaitText();
  }

  private _updateWaitText() {
    const alive = [...roomState.players.values()].filter(p => p.alive && p.id !== roomState.myId);
    const lines = alive.map(p => `${p.name}  ${colorHex(p.color)}`);
    if (this.multiWaitTxt) {
      this.multiWaitTxt.setText(
        alive.length > 0
          ? 'Hâlâ oynayan:\n' + alive.map(p => p.name).join('  /  ')
          : 'Herkes elendi...',
      );
    }
    void lines;
  }

  shutdown() {
    if (!this.multiMode) return;
    const s = getSocket();
    s.off('player-pos');
    s.off('player-died');
    s.off('game-over');
    s.off('room-destroyed');
    /* 2. oyun için eski dot referanslarını temizle */
    this.multiDots.clear();
    s.off('player-left');
  }
}
