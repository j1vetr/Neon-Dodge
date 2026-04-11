
/* =========================================================
   GAME SCENE
   Core gameplay: auto-upward scroll, tap to switch direction,
   obstacles, lasers, slow-motion, particles, screen shake.
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT,
  PLAYER_SIZE, PLAYER_HORIZONTAL_SPEED, PLAYER_START_X, PLAYER_START_Y,
  BASE_SCROLL_SPEED, SCROLL_SPEED_INCREMENT, MAX_SCROLL_SPEED,
  OBSTACLE_SPAWN_INTERVAL_MS, OBSTACLE_SPAWN_MIN_MS,
  OBSTACLE_THICKNESS, GAP_MIN, GAP_MAX,
  LASER_THICKNESS, LASER_WARN_DURATION,
  TRAIL_PARTICLE_LIFETIME, TRAIL_EMIT_INTERVAL,
  SLOWMO_PROXIMITY, SLOWMO_TIMESCALE,
  SHAKE_DURATION, SHAKE_INTENSITY,
  COLOR_BG, COLOR_WALL, COLOR_LASER,
  SKINS, STORAGE_HIGHSCORE,
} from '../constants';
import { playTap, playHit, playScore, playLaserWarn } from '../audio';

/* ---- Types ---- */
interface Obstacle {
  body: Phaser.GameObjects.Rectangle;
  isLaser: boolean;
  warned?: boolean;
  born?: number; // time laser body becomes active
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
  private playerHex!: string;
  private dirX = 1; // 1 = right, -1 = left
  private playerVX = 0;

  /* Scrolling */
  private scrollSpeed = BASE_SCROLL_SPEED;
  private elapsedTime = 0;
  private lastSpeedUpdate = 0;

  /* Obstacles */
  private obstacles: Obstacle[] = [];
  private spawnTimer = 0;
  private spawnInterval = OBSTACLE_SPAWN_INTERVAL_MS;

  /* Trail */
  private trailParticles: TrailParticle[] = [];
  private lastTrailTime = 0;

  /* Score */
  private score = 0;
  private lastScoreChime = 0;
  private scoreTxt!: Phaser.GameObjects.Text;
  private bestTxt!: Phaser.GameObjects.Text;
  private highScore = 0;

  /* State */
  private alive = true;
  private slowMo = false;

  /* Graphics layer for obstacles */
  private obstacleGraphics!: Phaser.GameObjects.Graphics;

  /* Input guard */
  private lastTapTime = 0;

  /* Tween for slow-mo visual */
  private slowTween?: Phaser.Tweens.Tween;

  /* Skin */
  private skinIndex = 0;

  constructor() { super({ key: 'GameScene' }); }

  init(data: { skin?: number }) {
    this.skinIndex = data?.skin ?? 0;
    this.playerColor = SKINS[this.skinIndex].color;
    this.playerHex = SKINS[this.skinIndex].hex;
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* Background */
    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);

    /* Star field (static) */
    this._createStars();

    /* Scrolling grid lines */
    this._createGrid();

    /* Obstacle graphics */
    this.obstacleGraphics = this.add.graphics();

    /* Player glow ring */
    this.playerGlow = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE + 10, this.playerColor, 0.12);

    /* Player */
    this.player = this.add.circle(PLAYER_START_X, PLAYER_START_Y, PLAYER_SIZE, this.playerColor, 1);
    this.player.setDepth(10);
    this.playerGlow.setDepth(9);

    /* Score text */
    this.scoreTxt = this.add.text(W / 2, 28, '0s', {
      fontSize: '26px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#00ffff', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(20);

    /* High score */
    this.highScore = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    this.bestTxt = this.add.text(W - 12, 14, `Best: ${this.highScore}s`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#556677',
    }).setOrigin(1, 0).setDepth(20);

    /* Side walls always visible */
    this._drawSideWalls();

    /* Input */
    this.input.on('pointerdown', this._onTap, this);
    this.input.keyboard?.on('keydown-SPACE', this._onTap, this);

    /* Reset state */
    this.alive = true;
    this.score = 0;
    this.elapsedTime = 0;
    this.scrollSpeed = BASE_SCROLL_SPEED;
    this.spawnInterval = OBSTACLE_SPAWN_INTERVAL_MS;
    this.spawnTimer = 0;
    this.obstacles = [];
    this.trailParticles = [];
    this.dirX = 1;
    this.playerVX = PLAYER_HORIZONTAL_SPEED;
    this.slowMo = false;
  }

  /* --------------------------------------------------------
     TAP HANDLER
  -------------------------------------------------------- */
  private _onTap() {
    if (!this.alive) return;
    const now = this.time.now;
    if (now - this.lastTapTime < 100) return; // debounce
    this.lastTapTime = now;

    this.dirX *= -1;
    this.playerVX = PLAYER_HORIZONTAL_SPEED * this.dirX;
    playTap();

    /* Flash player on tap */
    this.tweens.add({
      targets: this.player,
      scaleX: 1.4, scaleY: 1.4,
      duration: 80, yoyo: true,
    });
  }

  /* --------------------------------------------------------
     MAIN UPDATE
  -------------------------------------------------------- */
  update(time: number, delta: number) {
    if (!this.alive) return;

    const dt = delta / 1000; // seconds

    /* Increase speed over time */
    this.elapsedTime += dt;
    if (this.elapsedTime - this.lastSpeedUpdate > 1) {
      this.scrollSpeed = Math.min(
        BASE_SCROLL_SPEED + this.elapsedTime * SCROLL_SPEED_INCREMENT,
        MAX_SCROLL_SPEED,
      );
      this.spawnInterval = Math.max(
        OBSTACLE_SPAWN_INTERVAL_MS - this.elapsedTime * 15,
        OBSTACLE_SPAWN_MIN_MS,
      );
      this.lastSpeedUpdate = this.elapsedTime;
    }

    /* Score (whole seconds) */
    const newScore = Math.floor(this.elapsedTime);
    if (newScore > this.score) {
      this.score = newScore;
      this.scoreTxt.setText(`${this.score}s`);
      if (this.score % 5 === 0) playScore(this.score / 5);
    }

    /* Move player horizontally */
    const px = this.player.x + this.playerVX * dt;
    const clamped = Phaser.Math.Clamp(px, PLAYER_SIZE + 2, GAME_WIDTH - PLAYER_SIZE - 2);
    if (px !== clamped) {
      /* Bounce off side wall */
      this.dirX *= -1;
      this.playerVX = PLAYER_HORIZONTAL_SPEED * this.dirX;
    }
    this.player.x = clamped;
    this.playerGlow.x = clamped;
    this.playerGlow.y = this.player.y;

    /* Spawn obstacles */
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this._spawnObstacle(time);
    }

    /* Check proximity for slow-mo */
    const minDist = this._getMinObstacleDistance();
    const targetScale = minDist < SLOWMO_PROXIMITY ? SLOWMO_TIMESCALE : 1;
    if (targetScale < 1 && !this.slowMo) {
      this.slowMo = true;
      this.time.timeScale = SLOWMO_TIMESCALE;
      this.tweens.timeScale = SLOWMO_TIMESCALE;
      /* Tint camera slightly blue */
      this.cameras.main.setBackgroundColor(0x000511);
    } else if (targetScale === 1 && this.slowMo) {
      this.slowMo = false;
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
      this.cameras.main.setBackgroundColor(COLOR_BG);
    }

    /* Move & update obstacles */
    this._updateObstacles(dt, time);

    /* Collision detection */
    if (this._checkCollision()) {
      this._onDeath();
      return;
    }

    /* Trail */
    if (time - this.lastTrailTime > TRAIL_EMIT_INTERVAL) {
      this.lastTrailTime = time;
      this._emitTrail(time);
    }
    this._updateTrail(time);

    /* Glow pulse */
    this.playerGlow.setRadius(PLAYER_SIZE + 8 + Math.sin(time * 0.005) * 4);
  }

  /* --------------------------------------------------------
     OBSTACLE SPAWNING
  -------------------------------------------------------- */
  private _spawnObstacle(time: number) {
    const W = GAME_WIDTH;
    const roll = Math.random();
    const isLaser = this.elapsedTime > 8 && roll > 0.65;
    const y = -20;

    if (isLaser) {
      // Horizontal laser — warn first, activate after warn duration
      const laserGfx = this.add.rectangle(W / 2, y, W - 4, LASER_THICKNESS, COLOR_LASER, 0.25);
      this.obstacles.push({ body: laserGfx, isLaser: true, warned: false, born: time + LASER_WARN_DURATION });
      playLaserWarn();
    } else {
      // Wall with gap
      const gapSize = Phaser.Math.Between(GAP_MIN, GAP_MAX);
      const gapX = Phaser.Math.Between(PLAYER_SIZE * 2, W - PLAYER_SIZE * 2 - gapSize);

      // Left wall segment
      const leftW = gapX;
      const leftX = leftW / 2;
      const left = this.add.rectangle(leftX, y, leftW, OBSTACLE_THICKNESS, COLOR_WALL, 1);
      left.setStrokeStyle(1, 0xff6688, 0.6);

      // Right wall segment
      const rightW = W - gapX - gapSize;
      const rightX = gapX + gapSize + rightW / 2;
      const right = this.add.rectangle(rightX, y, rightW, OBSTACLE_THICKNESS, COLOR_WALL, 1);
      right.setStrokeStyle(1, 0xff6688, 0.6);

      this.obstacles.push(
        { body: left, isLaser: false },
        { body: right, isLaser: false },
      );
    }
  }

  private _updateObstacles(dt: number, time: number) {
    const speed = this.slowMo ? this.scrollSpeed * SLOWMO_TIMESCALE : this.scrollSpeed;
    const toRemove: number[] = [];

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.body.y += speed * dt;

      if (obs.isLaser) {
        // Warn: flickering opacity before it activates
        const active = obs.born && time >= obs.born;
        if (!active) {
          obs.body.fillAlpha = 0.15 + 0.35 * Math.sin(time * 0.02);
          obs.body.setFillStyle(0xff4400, obs.body.fillAlpha);
        } else {
          obs.body.setFillStyle(COLOR_LASER, 0.9);
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
      if (obs.isLaser && obs.born && this.time.now < obs.born) continue; // not active yet

      const bx = obs.body.x, by = obs.body.y;
      const hw = obs.body.displayWidth / 2, hh = obs.body.displayHeight / 2;

      const nearX = Phaser.Math.Clamp(px, bx - hw, bx + hw);
      const nearY = Phaser.Math.Clamp(py, by - hh, by + hh);
      const dx = px - nearX, dy = py - nearY;
      if (dx * dx + dy * dy <= pr * pr) return true;
    }
    return false;
  }

  private _getMinObstacleDistance(): number {
    let min = Infinity;
    const px = this.player.x, py = this.player.y;
    for (const obs of this.obstacles) {
      const bx = obs.body.x, by = obs.body.y;
      const hw = obs.body.displayWidth / 2, hh = obs.body.displayHeight / 2;
      const nearX = Phaser.Math.Clamp(px, bx - hw, bx + hw);
      const nearY = Phaser.Math.Clamp(py, by - hh, by + hh);
      const d = Math.hypot(px - nearX, py - nearY);
      if (d < min) min = d;
    }
    return min;
  }

  /* --------------------------------------------------------
     DEATH
  -------------------------------------------------------- */
  private _onDeath() {
    this.alive = false;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;

    playHit();
    this.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY);

    /* Save high score */
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(STORAGE_HIGHSCORE, String(this.highScore));
    }

    /* Flash player red */
    this.tweens.add({
      targets: this.player,
      scaleX: 0, scaleY: 0,
      alpha: 0,
      duration: 400,
    });

    /* Burst of particles */
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = Phaser.Math.Between(60, 200);
      const px = this.player.x, py = this.player.y;
      const dot = this.add.circle(px, py, Phaser.Math.Between(2, 5), this.playerColor, 1);
      this.tweens.add({
        targets: dot,
        x: px + Math.cos(angle) * speed,
        y: py + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(300, 600),
        ease: 'Power2',
        onComplete: () => dot.destroy(),
      });
    }

    this.time.delayedCall(900, () => {
      this.scene.start('GameOverScene', { score: this.score, best: this.highScore, skin: this.skinIndex });
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
    /* Left border */
    g.fillStyle(0xff2060, 0.6);
    g.fillRect(0, 0, 2, GAME_HEIGHT);
    /* Right border */
    g.fillRect(GAME_WIDTH - 2, 0, 2, GAME_HEIGHT);
  }
}
