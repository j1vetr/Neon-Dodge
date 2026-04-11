
/* =========================================================
   GAME SCENE
   Core gameplay: auto-upward scroll, tap to switch direction,
   obstacles, lasers, level system, particles, screen shake.

   CHANGE LOG:
   - Slow-motion REMOVED entirely — game speed never changes mid-play
   - Level system added: every LEVEL_DURATION seconds → new level
     Each level has its own speed, spawn rate, gap size, wall colour
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT,
  PLAYER_SIZE, PLAYER_HORIZONTAL_SPEED, PLAYER_START_X, PLAYER_START_Y,
  LEVELS, LEVEL_DURATION, LevelDef,
  OBSTACLE_THICKNESS, LASER_THICKNESS, LASER_WARN_DURATION, LASER_STARTS_AT_LEVEL,
  TRAIL_PARTICLE_LIFETIME, TRAIL_EMIT_INTERVAL,
  SHAKE_DURATION, SHAKE_INTENSITY,
  COLOR_BG, COLOR_LASER,
  SKINS, STORAGE_HIGHSCORE,
} from '../constants';
import { playTap, playHit, playScore, playLaserWarn } from '../audio';

/* ---- Types ---- */
interface Obstacle {
  body: Phaser.GameObjects.Rectangle;
  isLaser: boolean;
  born?: number; // real timestamp when laser becomes lethal
}

interface TrailParticle {
  circle: Phaser.GameObjects.Arc;
  born: number;
  lifetime: number;
}

export class GameScene extends Phaser.Scene {
  /* Player */
  private player!: Phaser.GameObjects.Arc;
  private playerGlow!: Phaser.GameObjects.Arc;
  private playerColor!: number;
  private dirX = 1;
  private playerVX = 0;

  /* Obstacles */
  private obstacles: Obstacle[] = [];
  private spawnTimer = 0;

  /* Trail */
  private trailParticles: TrailParticle[] = [];
  private lastTrailTime = 0;

  /* Score / time */
  private score = 0;
  private elapsedTime = 0;
  private scoreTxt!: Phaser.GameObjects.Text;
  private highScore = 0;

  /* Level system */
  private currentLevel = 0;        // index into LEVELS[]
  private levelDef!: LevelDef;     // current level config
  private levelTxt!: Phaser.GameObjects.Text;
  private levelBannerContainer!: Phaser.GameObjects.Container;

  /* State */
  private alive = true;

  /* Input debounce */
  private lastTapTime = 0;

  /* Skin */
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

    /* Background */
    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);
    this._createStars();
    this._createGrid();

    /* Side walls */
    this._drawSideWalls();

    /* Player glow ring (behind player) */
    this.playerGlow = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE + 10, this.playerColor, 0.12);
    this.playerGlow.setDepth(9);

    /* Player */
    this.player = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE, this.playerColor, 1);
    this.player.setDepth(10);

    /* HUD — score (center top) */
    this.scoreTxt = this.add.text(W / 2, 28, '0s', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#00ffff', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(20);

    /* HUD — best (top right) */
    this.highScore = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    this.add.text(W - 12, 14, `Best: ${this.highScore}s`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#334455',
    }).setOrigin(1, 0).setDepth(20);

    /* HUD — level (top left) */
    this.levelTxt = this.add.text(12, 14, 'LVL 1', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ff2060',
    }).setOrigin(0, 0).setDepth(20);

    /* Level-up banner container (initially hidden) */
    this.levelBannerContainer = this.add.container(W / 2, H / 2);
    this.levelBannerContainer.setDepth(30);
    this.levelBannerContainer.setAlpha(0);

    /* Input */
    this.input.on('pointerdown', this._onTap, this);
    this.input.keyboard?.on('keydown-SPACE', this._onTap, this);

    /* Reset state */
    this.alive = true;
    this.score = 0;
    this.elapsedTime = 0;
    this.spawnTimer = 0;
    this.obstacles = [];
    this.trailParticles = [];
    this.dirX = 1;
    this.currentLevel = 0;
    this.levelDef = LEVELS[0];
    this.playerVX = PLAYER_HORIZONTAL_SPEED * this.levelDef.playerSpeedMult;

    /* Update level label colour */
    this._updateLevelLabel();
  }

  /* --------------------------------------------------------
     TAP HANDLER
  -------------------------------------------------------- */
  private _onTap() {
    if (!this.alive) return;
    const now = this.time.now;
    if (now - this.lastTapTime < 80) return;
    this.lastTapTime = now;

    this.dirX *= -1;
    this.playerVX = PLAYER_HORIZONTAL_SPEED * this.levelDef.playerSpeedMult * this.dirX;
    playTap();

    /* Quick scale flash */
    this.tweens.add({
      targets: this.player,
      scaleX: 1.35, scaleY: 1.35,
      duration: 70, yoyo: true,
    });
  }

  /* --------------------------------------------------------
     MAIN UPDATE
  -------------------------------------------------------- */
  update(time: number, delta: number) {
    if (!this.alive) return;

    const dt = delta / 1000;
    this.elapsedTime += dt;

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

    /* ------- Score display (whole seconds) ------- */
    const newScore = Math.floor(this.elapsedTime);
    if (newScore > this.score) {
      this.score = newScore;
      this.scoreTxt.setText(`${this.score}s`);
      if (this.score % 5 === 0) playScore(this.score / 5);
    }

    /* ------- Player horizontal movement ------- */
    const px = this.player.x + this.playerVX * dt;
    const clamped = Phaser.Math.Clamp(px, PLAYER_SIZE + 2, GAME_WIDTH - PLAYER_SIZE - 2);
    if (px !== clamped) {
      this.dirX *= -1;
      this.playerVX = PLAYER_HORIZONTAL_SPEED * this.levelDef.playerSpeedMult * this.dirX;
    }
    this.player.x = clamped;
    this.playerGlow.x = clamped;
    this.playerGlow.y = this.player.y;

    /* ------- Spawn obstacles ------- */
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.levelDef.spawnMs) {
      this.spawnTimer = 0;
      this._spawnObstacle(time);
    }

    /* ------- Move obstacles ------- */
    this._updateObstacles(dt, time);

    /* ------- Collision ------- */
    if (this._checkCollision()) {
      this._onDeath();
      return;
    }

    /* ------- Trail ------- */
    if (time - this.lastTrailTime > TRAIL_EMIT_INTERVAL) {
      this.lastTrailTime = time;
      this._emitTrail(time);
    }
    this._updateTrail(time);

    /* ------- Glow pulse ------- */
    this.playerGlow.setRadius(PLAYER_SIZE + 8 + Math.sin(time * 0.005) * 4);
  }

  /* --------------------------------------------------------
     LEVEL UP
  -------------------------------------------------------- */
  private _onLevelUp() {
    /* Update HUD label */
    this._updateLevelLabel();

    /* Sound: two rising tones */
    playScore(this.currentLevel);

    /* Flash the camera briefly */
    this.cameras.main.flash(280, 10, 10, 10);

    /* "LEVEL X" banner animation */
    const W = GAME_WIDTH;
    const def = this.levelDef;
    const hexColor = '#' + def.wallColor.toString(16).padStart(6, '0');

    /* Clear previous banner children */
    this.levelBannerContainer.removeAll(true);
    this.levelBannerContainer.setAlpha(0);
    this.levelBannerContainer.setPosition(W / 2, GAME_HEIGHT * 0.42);

    /* Background pill */
    const pill = this.add.rectangle(0, 0, 240, 52, 0x000000, 0.7);
    pill.setStrokeStyle(2, def.wallColor, 1);
    this.levelBannerContainer.add(pill);

    /* Level label */
    const txt = this.add.text(0, -10, def.label, {
      fontSize: '22px', fontFamily: 'monospace',
      color: hexColor, stroke: hexColor, strokeThickness: 1,
    }).setOrigin(0.5);
    this.levelBannerContainer.add(txt);

    /* Speed sub-label */
    const sub = this.add.text(0, 14, `SPEED ×${def.playerSpeedMult.toFixed(2)}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#667788',
    }).setOrigin(0.5);
    this.levelBannerContainer.add(sub);

    /* Fade-in → hold → fade-out */
    this.tweens.add({
      targets: this.levelBannerContainer,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.time.delayedCall(900, () => {
          this.tweens.add({
            targets: this.levelBannerContainer,
            alpha: 0,
            duration: 300,
          });
        });
      },
    });
  }

  private _updateLevelLabel() {
    const def = this.levelDef;
    const hexColor = '#' + def.wallColor.toString(16).padStart(6, '0');
    this.levelTxt.setText(`LVL ${this.currentLevel + 1}`);
    this.levelTxt.setStyle({ color: hexColor });
  }

  /* --------------------------------------------------------
     OBSTACLE SPAWNING — uses current level's config
  -------------------------------------------------------- */
  private _spawnObstacle(time: number) {
    const W = GAME_WIDTH;
    const def = this.levelDef;

    /* Lasers only appear from LASER_STARTS_AT_LEVEL onwards */
    const lasersUnlocked = this.currentLevel >= LASER_STARTS_AT_LEVEL - 1;
    const isLaser = lasersUnlocked && Math.random() > 0.70;
    const y = -20;

    if (isLaser) {
      const laserGfx = this.add.rectangle(W / 2, y, W - 4, LASER_THICKNESS, COLOR_LASER, 0.25);
      this.obstacles.push({ body: laserGfx, isLaser: true, born: time + LASER_WARN_DURATION });
      playLaserWarn();
    } else {
      /* Use current level's gap range */
      const gapSize = Phaser.Math.Between(def.gapMin, def.gapMax);
      const gapX = Phaser.Math.Between(PLAYER_SIZE * 2, W - PLAYER_SIZE * 2 - gapSize);

      const leftW = gapX;
      const leftX = leftW / 2;
      const left = this.add.rectangle(leftX, y, leftW, OBSTACLE_THICKNESS, def.wallColor, 1);
      left.setStrokeStyle(1, Phaser.Display.Color.IntegerToColor(def.wallColor).lighten(20).color, 0.5);

      const rightW = W - gapX - gapSize;
      const rightX = gapX + gapSize + rightW / 2;
      const right = this.add.rectangle(rightX, y, rightW, OBSTACLE_THICKNESS, def.wallColor, 1);
      right.setStrokeStyle(1, Phaser.Display.Color.IntegerToColor(def.wallColor).lighten(20).color, 0.5);

      this.obstacles.push(
        { body: left, isLaser: false },
        { body: right, isLaser: false },
      );
    }
  }

  /* --------------------------------------------------------
     OBSTACLE UPDATE — speed from current level def
  -------------------------------------------------------- */
  private _updateObstacles(dt: number, time: number) {
    const speed = this.levelDef.scrollSpeed;
    const toRemove: number[] = [];

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.body.y += speed * dt;

      if (obs.isLaser) {
        const active = obs.born != null && time >= obs.born;
        if (!active) {
          /* Flickering warning colour — orange tint */
          const flicker = 0.15 + 0.35 * Math.sin(time * 0.025);
          obs.body.setFillStyle(0xff4400, flicker);
        } else {
          obs.body.setFillStyle(COLOR_LASER, 0.92);
          obs.body.setDisplaySize(GAME_WIDTH - 4, LASER_THICKNESS);
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
     COLLISION
  -------------------------------------------------------- */
  private _checkCollision(): boolean {
    const px = this.player.x, py = this.player.y, pr = PLAYER_SIZE * 0.75;

    for (const obs of this.obstacles) {
      if (obs.isLaser && obs.born != null && this.time.now < obs.born) continue;

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

    playHit();
    this.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY);

    /* Save high score */
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(STORAGE_HIGHSCORE, String(this.highScore));
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
      const speed = Phaser.Math.Between(60, 220);
      const px = this.player.x, py = this.player.y;
      const dot = this.add.circle(px, py, Phaser.Math.Between(2, 5), this.playerColor, 1);
      this.tweens.add({
        targets: dot,
        x: px + Math.cos(angle) * speed,
        y: py + Math.sin(angle) * speed,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(300, 650),
        ease: 'Power2',
        onComplete: () => dot.destroy(),
      });
    }

    this.time.delayedCall(900, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        best: this.highScore,
        skin: this.skinIndex,
        level: this.currentLevel + 1,
      });
    });
  }

  /* --------------------------------------------------------
     TRAIL PARTICLES
  -------------------------------------------------------- */
  private _emitTrail(time: number) {
    const dot = this.add.circle(
      this.player.x + Phaser.Math.Between(-4, 4),
      this.player.y + Phaser.Math.Between(4, 10),
      Phaser.Math.Between(2, 5),
      this.playerColor,
      0.7,
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
     VISUALS
  -------------------------------------------------------- */
  private _createStars() {
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      this.add.circle(x, y, Math.random() * 1.2 + 0.2, 0xffffff, Math.random() * 0.5 + 0.05);
    }
  }

  private _createGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x001122, 0.3);
    for (let x = 0; x <= GAME_WIDTH; x += 40) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += 40) g.lineBetween(0, y, GAME_WIDTH, y);
  }

  private _drawSideWalls() {
    const g = this.add.graphics();
    g.fillStyle(0xff2060, 0.6);
    g.fillRect(0, 0, 2, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - 2, 0, 2, GAME_HEIGHT);
  }
}
