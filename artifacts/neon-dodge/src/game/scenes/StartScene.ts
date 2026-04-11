
/* =========================================================
   START SCENE — animated neon title (no image logo)
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLOR_BG, SKINS,
  STORAGE_HIGHSCORE, STORAGE_SKIN,
  STORAGE_GAMES_PLAYED, STORAGE_TOTAL_TIME, STORAGE_MAX_COMBO,
} from '../constants';

export class StartScene extends Phaser.Scene {
  private selectedSkin = 0;
  private floatingPlayer!: Phaser.GameObjects.Arc;
  private playerTrail: Phaser.GameObjects.Arc[] = [];
  private playerTrailTimer = 0;
  private skinDots: Phaser.GameObjects.Arc[] = [];
  private skinRings: Phaser.GameObjects.Arc[] = [];

  /* Title glitch */
  private glitchTimer   = 0;
  private glitchActive  = false;
  private titleNeon!: Phaser.GameObjects.Text;
  private titleDodge!: Phaser.GameObjects.Text;
  private glitchTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'StartScene' }); }

  /* --------------------------------------------------------
     CREATE
  -------------------------------------------------------- */
  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* ── Background layers ─────────────────────────────── */
    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);
    this._drawPerspectiveGrid();
    this._drawStars();
    this._drawScanlines();

    /* ── Animated NEON DODGE title ─────────────────────── */
    this._buildTitle();

    /* ── High score badge ──────────────────────────────── */
    this._buildHighScore();

    /* ── Floating player preview ───────────────────────── */
    this.selectedSkin = parseInt(localStorage.getItem(STORAGE_SKIN) || '0', 10);
    this._buildFloatingPlayer();

    /* ── Skin dot selector ─────────────────────────────── */
    this._buildSkinSelector();

    /* ── PLAY button ───────────────────────────────────── */
    this._buildPlayButton();

    /* ── Stats footer ──────────────────────────────────── */
    this._buildStats();

    /* ── Version ───────────────────────────────────────── */
    this.add.text(W - 10, H - 14, 'NEON DODGE v2', {
      fontSize: '10px', fontFamily: 'monospace', color: '#1a2a3a',
    }).setOrigin(1, 1);
  }

  /* --------------------------------------------------------
     UPDATE — player trail + glitch ticker
  -------------------------------------------------------- */
  update(_time: number, delta: number) {
    /* Player trail */
    this.playerTrailTimer += delta;
    if (this.playerTrailTimer > 55) {
      this.playerTrailTimer = 0;
      const skin = SKINS[this.selectedSkin];
      const dot = this.add.circle(
        this.floatingPlayer.x + Phaser.Math.Between(-4, 4),
        this.floatingPlayer.y + Phaser.Math.Between(-4, 4),
        Phaser.Math.Between(2, 5),
        skin.color, 0.5,
      );
      this.playerTrail.push(dot);
      if (this.playerTrail.length > 10) {
        const old = this.playerTrail.shift();
        old?.destroy();
      }
      this.playerTrail.forEach((d, i) => {
        d.setAlpha((i / this.playerTrail.length) * 0.4);
      });
    }

    /* Glitch cycle: every ~4s fires for 80–180ms */
    this.glitchTimer += delta;
    if (!this.glitchActive && this.glitchTimer > 4000 + Math.random() * 2000) {
      this.glitchTimer = 0;
      this._fireGlitch();
    }
  }

  /* --------------------------------------------------------
     PERSPECTIVE GRID — Tron-style vanishing point
  -------------------------------------------------------- */
  private _drawPerspectiveGrid() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const g = this.add.graphics();
    const vX = W / 2, vY = H * 0.58;

    const hCount = 10;
    for (let i = 0; i <= hCount; i++) {
      const t = (i / hCount) ** 1.8;
      const y = vY + (H - vY) * t;
      const alpha = 0.06 + t * 0.18;
      g.lineStyle(1, 0x00aaff, alpha);
      g.lineBetween(0, y, W, y);
    }

    const vCount = 12;
    for (let i = 0; i <= vCount; i++) {
      const bx = (i / vCount) * W;
      const alpha = 0.06 + 0.10 * Math.abs(i - vCount / 2) / (vCount / 2);
      g.lineStyle(1, 0x00aaff, alpha);
      g.lineBetween(vX, vY, bx, H);
    }

    g.lineStyle(1, 0x001a33, 0.22);
    for (let x = 0; x <= W; x += 40) g.lineBetween(x, 0, x, vY);
    for (let y = 0; y <= vY; y += 40) g.lineBetween(0, y, W, y);
  }

  /* --------------------------------------------------------
     STARS — neon-tinted specks
  -------------------------------------------------------- */
  private _drawStars() {
    const palette = [0xffffff, 0x00ffff, 0xff2060, 0xffcc00, 0x8844ff];
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT * 0.58);
      const r = Math.random() * 1.4 + 0.3;
      const col = palette[Math.floor(Math.random() * palette.length)];
      const alpha = Math.random() * 0.55 + 0.08;
      const star = this.add.circle(x, y, r, col, alpha);
      this.tweens.add({
        targets: star,
        alpha: { from: alpha, to: alpha * 0.1 },
        duration: Phaser.Math.Between(900, 3000),
        yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2500),
        ease: 'Sine.easeInOut',
      });
    }
  }

  /* --------------------------------------------------------
     SCANLINES — subtle CRT feel
  -------------------------------------------------------- */
  private _drawScanlines() {
    const g = this.add.graphics().setAlpha(0.04);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      g.fillStyle(0x000000, 1);
      g.fillRect(0, y, GAME_WIDTH, 2);
    }
  }

  /* --------------------------------------------------------
     TITLE — layered neon glow text "NEON DODGE"
  -------------------------------------------------------- */
  private _buildTitle() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2;
    const neonY  = H * 0.155;
    const dodgeY = H * 0.265;

    const neonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '62px',
      fontFamily: '"Arial Black", "Impact", monospace',
      fontStyle: 'bold',
      color: '#00eeff',
      stroke: '#006688',
      strokeThickness: 4,
      shadow: { color: '#00eeff', blur: 32, offsetX: 0, offsetY: 0, fill: true, stroke: true },
    };

    const dodgeStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '52px',
      fontFamily: '"Arial Black", "Impact", monospace',
      fontStyle: 'bold',
      color: '#ff22aa',
      stroke: '#880044',
      strokeThickness: 3,
      shadow: { color: '#ff22aa', blur: 28, offsetX: 0, offsetY: 0, fill: true, stroke: true },
    };

    /* ── Outer glow layers (slightly bigger, lower alpha) ── */
    const neonGlow = this.add.text(cx, neonY, 'NEON', {
      ...neonStyle, color: '#00eeff', stroke: '#00eeff',
      strokeThickness: 16, alpha: 0.18,
    }).setOrigin(0.5).setAlpha(0.18);

    const dodgeGlow = this.add.text(cx, dodgeY, 'DODGE', {
      ...dodgeStyle, color: '#ff22aa', stroke: '#ff22aa',
      strokeThickness: 14, alpha: 0.18,
    }).setOrigin(0.5).setAlpha(0.18);

    /* ── Separator bar between words ── */
    const bar = this.add.graphics();
    bar.lineStyle(1, 0x00eeff, 0.35);
    bar.lineBetween(cx - 70, (neonY + dodgeY) / 2, cx + 70, (neonY + dodgeY) / 2);

    /* ── Main text ── */
    this.titleNeon  = this.add.text(cx, neonY,  'NEON',  neonStyle).setOrigin(0.5).setAlpha(0);
    this.titleDodge = this.add.text(cx, dodgeY, 'DODGE', dodgeStyle).setOrigin(0.5).setAlpha(0);

    /* ── Tagline ── */
    const tag = this.add.text(cx, dodgeY + 38, 'S U R V I V E   T H E   N E O N', {
      fontSize: '9px', fontFamily: 'monospace', color: '#334455', letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);

    /* ── Entry animations ── */
    this.tweens.add({
      targets: this.titleNeon,
      alpha: 1, y: neonY,
      duration: 550, ease: 'Back.Out', delay: 60,
    });
    this.tweens.add({
      targets: this.titleDodge,
      alpha: 1, y: dodgeY,
      duration: 550, ease: 'Back.Out', delay: 160,
    });
    this.tweens.add({
      targets: tag,
      alpha: 0.85, duration: 600, delay: 380,
    });

    /* ── Breathing glow pulse ── */
    this.tweens.add({
      targets: [neonGlow, dodgeGlow],
      alpha: { from: 0.18, to: 0.38 },
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* ── Float bob (all title elements) ── */
    this.tweens.add({
      targets: [this.titleNeon, this.titleDodge, neonGlow, dodgeGlow, bar, tag],
      y: '-=8',
      duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* ── Shimmer: periodically tint NEON text white for a flash ── */
    this.time.addEvent({
      delay: 2800,
      loop: true,
      callback: () => {
        if (this.glitchActive) return;
        this.tweens.add({
          targets: this.titleNeon,
          alpha: { from: 1, to: 0.6 },
          duration: 80, yoyo: true, repeat: 1,
        });
      },
    });
  }

  /* --------------------------------------------------------
     GLITCH — RGB-split flash on text
  -------------------------------------------------------- */
  private _fireGlitch() {
    this.glitchActive = true;
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const neonY  = H * 0.155;
    const dodgeY = H * 0.265;

    const tints  = ['#ff0044', '#00ffff', '#ffee00'];
    const labels = ['NEON', 'DODGE'];
    const yPos   = [neonY, dodgeY];
    const sizes  = ['62px', '52px'];

    for (let t = 0; t < 3; t++) {
      for (let l = 0; l < 2; l++) {
        const ox = Phaser.Math.Between(-9, 9);
        const oy = Phaser.Math.Between(-4, 4);
        const gt = this.add.text(W / 2 + ox, yPos[l] + oy, labels[l], {
          fontSize: sizes[l],
          fontFamily: '"Arial Black", "Impact", monospace',
          fontStyle: 'bold',
          color: tints[t],
          alpha: 0.28,
        }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);
        this.glitchTexts.push(gt);
      }
    }

    /* Briefly shift the real text */
    const ox1 = Phaser.Math.Between(-5, 5);
    const origN = this.titleNeon.x;
    const origD = this.titleDodge.x;
    this.titleNeon.x  = origN + ox1;
    this.titleDodge.x = origD - ox1;

    const dur = 70 + Math.random() * 110;
    this.time.delayedCall(dur, () => {
      this.glitchTexts.forEach(g => g.destroy());
      this.glitchTexts = [];
      this.titleNeon.x  = origN;
      this.titleDodge.x = origD;
      this.glitchActive = false;
      this.glitchTimer  = 0;
    });
  }

  /* --------------------------------------------------------
     HIGH SCORE
  -------------------------------------------------------- */
  private _buildHighScore() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const hi = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);

    const div = this.add.graphics();
    div.lineStyle(1, 0x00ffff, 0.08);
    div.lineBetween(W * 0.15, H * 0.385, W * 0.85, H * 0.385);

    if (hi > 0) {
      this.add.text(W / 2, H * 0.41, `★  BEST  ${hi}`, {
        fontSize: '15px', fontFamily: 'monospace', color: '#33aacc',
        stroke: '#006688', strokeThickness: 1,
      }).setOrigin(0.5);
    } else {
      this.add.text(W / 2, H * 0.41, 'NO RECORD YET', {
        fontSize: '13px', fontFamily: 'monospace', color: '#1a3040',
      }).setOrigin(0.5);
    }
  }

  /* --------------------------------------------------------
     FLOATING PLAYER PREVIEW
  -------------------------------------------------------- */
  private _buildFloatingPlayer() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const skin = SKINS[this.selectedSkin];
    const cx = W / 2, cy = H * 0.495;

    const ring  = this.add.circle(cx, cy, 28, 0x000000, 0).setStrokeStyle(1, skin.color, 0.14);
    const glow  = this.add.circle(cx, cy, 22, skin.color, 0.12);
    const inner = this.add.circle(cx, cy, 16, skin.color, 0.3);
    this.floatingPlayer = this.add.circle(cx, cy, 13, skin.color, 1);

    this.tweens.add({
      targets: [glow, inner, ring],
      alpha: { from: glow.alpha, to: glow.alpha * 0.2 },
      scaleX: 1.15, scaleY: 1.15,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: [this.floatingPlayer, glow, inner, ring],
      y: '-=12',
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  /* --------------------------------------------------------
     SKIN DOT SELECTOR
  -------------------------------------------------------- */
  private _buildSkinSelector() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cy = H * 0.578;
    const spacing = 38;
    const total = SKINS.length;
    const startX = W / 2 - ((total - 1) / 2) * spacing;

    this.add.text(W / 2, cy - 22, 'SELECT SKIN', {
      fontSize: '10px', fontFamily: 'monospace', color: '#223344', letterSpacing: 3,
    }).setOrigin(0.5);

    this.skinDots  = [];
    this.skinRings = [];

    for (let i = 0; i < total; i++) {
      const x = startX + i * spacing;
      const isSelected = i === this.selectedSkin;
      const col = SKINS[i].color;

      const ring = this.add.circle(x, cy, isSelected ? 14 : 11, 0x000000, 0)
        .setStrokeStyle(isSelected ? 2 : 1, col, isSelected ? 0.9 : 0.3);
      this.skinRings.push(ring);

      const dot = this.add.circle(x, cy, isSelected ? 10 : 6, col, isSelected ? 1 : 0.45)
        .setInteractive({ useHandCursor: true });
      this.skinDots.push(dot);

      dot.on('pointerover', () => {
        if (i !== this.selectedSkin) { dot.setRadius(8).setAlpha(0.75); }
      });
      dot.on('pointerout', () => {
        if (i !== this.selectedSkin) { dot.setRadius(6).setAlpha(0.45); }
      });
      dot.on('pointerdown', () => {
        this.selectedSkin = i;
        this._refreshSkinDots();
        this._updateFloatingPlayerColor();
      });
    }
  }

  private _refreshSkinDots() {
    for (let i = 0; i < SKINS.length; i++) {
      const col = SKINS[i].color;
      const isSelected = i === this.selectedSkin;
      this.skinDots[i].setRadius(isSelected ? 10 : 6).setAlpha(isSelected ? 1 : 0.45);
      this.skinRings[i]
        .setRadius(isSelected ? 14 : 11)
        .setStrokeStyle(isSelected ? 2 : 1, col, isSelected ? 0.9 : 0.3);
    }
  }

  private _updateFloatingPlayerColor() {
    const col = SKINS[this.selectedSkin].color;
    this.floatingPlayer.setFillStyle(col);
    this.playerTrail.forEach(d => d.setFillStyle(col));
  }

  /* --------------------------------------------------------
     PLAY BUTTON
  -------------------------------------------------------- */
  private _buildPlayButton() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H * 0.695;

    const glow = this.add.rectangle(cx, cy, 210, 54, 0x00ffff, 0.04)
      .setStrokeStyle(1, 0x00ffff, 0.18);

    const btn = this.add.rectangle(cx, cy, 196, 46, 0x000000, 0)
      .setStrokeStyle(2, 0x00ffff, 0.85)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(cx, cy, '▶   PLAY', {
      fontSize: '20px', fontFamily: 'monospace', color: '#00ffff',
      stroke: '#00ffff', strokeThickness: 1,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [glow, btn],
      alpha: { from: 1, to: 0.4 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: label,
      alpha: { from: 1, to: 0.55 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 80,
    });

    const _start = () => {
      localStorage.setItem(STORAGE_SKIN, String(this.selectedSkin));
      this.tweens.add({
        targets: [btn, glow, label],
        scaleX: 1.06, scaleY: 1.06, alpha: 1,
        duration: 80, yoyo: true,
        onComplete: () => this.scene.start('GameScene', { skin: this.selectedSkin }),
      });
    };

    btn.on('pointerdown', _start);
    label.setInteractive({ useHandCursor: true }).on('pointerdown', _start);

    this.input.on('pointerdown', (_ptr: unknown, go: Phaser.GameObjects.GameObject[]) => {
      if (go && go.length > 0) return;
      _start();
    });
  }

  /* --------------------------------------------------------
     STATS FOOTER
  -------------------------------------------------------- */
  private _buildStats() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const gamesPlayed = parseInt(localStorage.getItem(STORAGE_GAMES_PLAYED) || '0', 10);
    if (gamesPlayed === 0) return;

    const totalTime = parseFloat(localStorage.getItem(STORAGE_TOTAL_TIME) || '0');
    const maxCombo  = parseInt(localStorage.getItem(STORAGE_MAX_COMBO) || '0', 10);
    const cy = H * 0.80;

    const dg = this.add.graphics();
    dg.lineStyle(1, 0x00ffff, 0.07);
    dg.lineBetween(W * 0.12, cy - 20, W * 0.88, cy - 20);

    const col = (x: number, value: string, lbl: string) => {
      this.add.text(x, cy - 8, value, {
        fontSize: '14px', fontFamily: 'monospace', color: '#334d5c',
      }).setOrigin(0.5);
      this.add.text(x, cy + 10, lbl, {
        fontSize: '9px', fontFamily: 'monospace', color: '#1e2e38', letterSpacing: 1,
      }).setOrigin(0.5);
    };

    col(W * 0.22, `${gamesPlayed}`, 'GAMES');
    col(W * 0.50, `${Math.floor(totalTime)}s`, 'TOTAL TIME');
    col(W * 0.78, `${maxCombo}`, 'BEST COMBO');
  }
}
