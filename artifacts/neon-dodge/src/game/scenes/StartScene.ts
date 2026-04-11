
/* =========================================================
   START SCENE — Awwwards-style minimal neon typography
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLOR_BG, SKINS,
  STORAGE_HIGHSCORE, STORAGE_SKIN,
  STORAGE_GAMES_PLAYED, STORAGE_TOTAL_TIME, STORAGE_MAX_COMBO,
} from '../constants';

/* ── Module-level helpers ───────────────────────────────── */
function _diamond(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, r: number,
  color: number, alpha: number,
) {
  g.fillStyle(color, alpha);
  g.fillTriangle(x, y - r, x + r, y, x, y + r);
  g.fillTriangle(x, y - r, x - r, y, x, y + r);
}

/* =========================================================
   SCENE CLASS
   ========================================================= */
export class StartScene extends Phaser.Scene {
  private selectedSkin = 0;
  private floatingPlayer!: Phaser.GameObjects.Container;
  private floatingPlayerGfx!: Phaser.GameObjects.Graphics;
  private floatingPlayerCX = 0;
  private floatingPlayerCY = 0;
  private playerTrail: Phaser.GameObjects.Arc[] = [];
  private playerTrailTimer = 0;
  private skinDots: Phaser.GameObjects.Arc[] = [];
  private skinRings: Phaser.GameObjects.Arc[] = [];

  /* Title refs for glitch */
  private glitchTimer  = 0;
  private glitchActive = false;
  private titleNeon!: Phaser.GameObjects.Text;   // "NEON" small word
  private titleDodge!: Phaser.GameObjects.Text;  // "DODGE" hero
  private glitchTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'StartScene' }); }

  /* --------------------------------------------------------
     CREATE
  -------------------------------------------------------- */
  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);
    this._drawPerspectiveGrid();
    this._drawStars();
    this._drawScanlines();

    this._buildTitle();
    this._buildHighScore();

    this.selectedSkin = parseInt(localStorage.getItem(STORAGE_SKIN) || '0', 10);
    this._buildFloatingPlayer();
    this._buildSkinSelector();
    this._buildPlayButton();
    this._buildStats();

    this.add.text(W - 10, H - 14, 'NEON DODGE v2', {
      fontSize: '10px', fontFamily: 'monospace', color: '#1a2a3a',
    }).setOrigin(1, 1);
  }

  /* --------------------------------------------------------
     UPDATE
  -------------------------------------------------------- */
  update(_time: number, delta: number) {
    this.playerTrailTimer += delta;
    if (this.playerTrailTimer > 55) {
      this.playerTrailTimer = 0;
      const skin = SKINS[this.selectedSkin];
      /* Emit flame from rocket nozzle (nozzle bottom is +18px from container centre) */
      const flameColors = [skin.color, 0xffffff, 0xff8800, 0xffff00];
      const fCol = flameColors[Math.floor(Math.random() * flameColors.length)];
      const dot = this.add.circle(
        this.floatingPlayer.x + Phaser.Math.Between(-3, 3),
        this.floatingPlayer.y + 18 + Phaser.Math.Between(0, 5),
        Phaser.Math.Between(2, 4), fCol, 0.7,
      );
      this.playerTrail.push(dot);
      if (this.playerTrail.length > 10) this.playerTrail.shift()?.destroy();
      this.playerTrail.forEach((d, i) => d.setAlpha((i / this.playerTrail.length) * 0.4));
    }

    this.glitchTimer += delta;
    if (!this.glitchActive && this.glitchTimer > 4000 + Math.random() * 2000) {
      this.glitchTimer = 0;
      this._fireGlitch();
    }
  }

  /* --------------------------------------------------------
     PERSPECTIVE GRID
  -------------------------------------------------------- */
  private _drawPerspectiveGrid() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const g = this.add.graphics();
    const vX = W / 2, vY = H * 0.58;

    for (let i = 0; i <= 10; i++) {
      const t = (i / 10) ** 1.8;
      const y = vY + (H - vY) * t;
      g.lineStyle(1, 0x00aaff, 0.06 + t * 0.18);
      g.lineBetween(0, y, W, y);
    }
    for (let i = 0; i <= 12; i++) {
      const bx = (i / 12) * W;
      g.lineStyle(1, 0x00aaff, 0.06 + 0.10 * Math.abs(i - 6) / 6);
      g.lineBetween(vX, vY, bx, H);
    }
    g.lineStyle(1, 0x001a33, 0.22);
    for (let x = 0; x <= W; x += 40) g.lineBetween(x, 0, x, vY);
    for (let y = 0; y <= vY; y += 40) g.lineBetween(0, y, W, y);
  }

  /* --------------------------------------------------------
     STARS
  -------------------------------------------------------- */
  private _drawStars() {
    const palette = [0xffffff, 0x00ffff, 0xff2060, 0xffcc00, 0x8844ff];
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT * 0.58);
      const r = Math.random() * 1.4 + 0.3;
      const col = palette[Math.floor(Math.random() * palette.length)];
      const a = Math.random() * 0.55 + 0.08;
      const star = this.add.circle(x, y, r, col, a);
      this.tweens.add({
        targets: star, alpha: { from: a, to: a * 0.1 },
        duration: Phaser.Math.Between(900, 3000), yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2500), ease: 'Sine.easeInOut',
      });
    }
  }

  /* --------------------------------------------------------
     SCANLINES
  -------------------------------------------------------- */
  private _drawScanlines() {
    const g = this.add.graphics().setAlpha(0.04);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      g.fillStyle(0x000000, 1);
      g.fillRect(0, y, GAME_WIDTH, 2);
    }
  }

  /* --------------------------------------------------------
     TITLE — minimal Awwwards-style neon typography
     No thick boxy strokes. Glow = thin overlapping copies +
     Phaser.Graphics lines as decorative elements.
  -------------------------------------------------------- */
  private _buildTitle() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2;

    /* ── Vertical anchors ── */
    const neonY  = H * 0.148;  // "NEON" row
    const dodgeY = H * 0.242;  // "DODGE" row
    const tagY   = H * 0.324;  // tagline

    /* ── Thin decorative lines only (no text bounding boxes) ── */
    const dg = this.add.graphics();
    dg.lineStyle(1, 0x00eeff, 0.38);
    dg.lineBetween(cx - 102, neonY - 24, cx - 8, neonY - 24);
    dg.lineBetween(cx +   8, neonY - 24, cx + 102, neonY - 24);
    _diamond(dg, cx, neonY - 24, 4, 0x00eeff, 0.7);
    dg.lineStyle(1, 0xff22aa, 0.35);
    dg.lineBetween(cx - 122, dodgeY + 52, cx - 8, dodgeY + 52);
    dg.lineBetween(cx +   8, dodgeY + 52, cx + 122, dodgeY + 52);
    _diamond(dg, cx, dodgeY + 52, 4, 0xff22aa, 0.6);

    /* ── Matrix scramble → reveal per character ── */
    const SCRAMBLE = '!@#&%ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const floatAll: Phaser.GameObjects.GameObject[] = [dg];

    /* ── spawnChar: ONE object per letter, outline-only style ─────────
       Fill = game background color  →  interior appears hollow/dark
       Stroke = neon color            →  outline glows like a neon tube
       Zero glow-box layers: no overlapping objects, no rectangles.
    ─────────────────────────────────────────────────────────────────── */
    const BG = '#050510'; // same as COLOR_BG hex

    const spawnChar = (
      ch: string, x: number, y: number,
      outlineColor: string,
      mainPx: number, strokeW: number,
      startDelay: number,
    ): Phaser.GameObjects.Text => {
      /* Single crisp text — hollow neon-tube effect */
      const lc = this.add.text(x, y, ch, {
        fontSize: `${mainPx}px`,
        fontFamily: '"Orbitron", monospace',
        fontStyle: 'bold',
        color: BG,               // interior = dark bg  →  hollow look
        stroke: outlineColor,    // neon outline
        strokeThickness: strokeW,
        shadow: { color: outlineColor, blur: 10, fill: false, stroke: true, offsetX: 0, offsetY: 0 },
      }).setOrigin(0.5).setAlpha(0);

      /* Matrix scramble → lock on correct char */
      this.time.delayedCall(startDelay, () => {
        lc.setAlpha(1.0);
        let t = 0;
        const reps = 5 + Math.floor(Math.random() * 4);
        const ev = this.time.addEvent({
          delay: 55, repeat: reps,
          callback: () => {
            lc.setText(SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]);
            if (++t >= reps) {
              lc.setText(ch);
              /* ping: momentary brightness spike then settle */
              this.tweens.add({
                targets: lc,
                alpha: { from: 1.0, to: 0.55 },
                duration: 90, yoyo: true,
                onComplete: () => {
                  /* subtle breathing pulse after reveal */
                  this.tweens.add({
                    targets: lc,
                    alpha: { from: 1.0, to: 0.78 },
                    duration: 1200 + Math.random() * 600,
                    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
                    delay: Math.random() * 800,
                  });
                },
              });
              ev.remove();
            }
          },
        });
      });

      floatAll.push(lc);
      return lc;
    };

    /* ── NEON letters — 24px Orbitron, 2px stroke, cyan outline ── */
    const NEON = ['N', 'E', 'O', 'N'];
    const nSp = 28, nSt = cx - ((NEON.length - 1) / 2) * nSp;
    const neonLetters = NEON.map((ch, i) =>
      spawnChar(ch, nSt + i * nSp, neonY, '#00eeff', 24, 1.5, 40 + i * 80));
    this.titleNeon = neonLetters[neonLetters.length - 1];

    /* ── DODGE letters — 66px Orbitron, 2px stroke, pink outline ── */
    const DODGE = ['D', 'O', 'D', 'G', 'E'];
    const dSp = 56, dSt = cx - ((DODGE.length - 1) / 2) * dSp;
    const dodgeLetters = DODGE.map((ch, i) =>
      spawnChar(ch, dSt + i * dSp, dodgeY, '#ff22aa', 66, 2, 280 + i * 75));
    this.titleDodge = dodgeLetters[dodgeLetters.length - 1];

    /* ── Tagline fades in after all letters resolve ── */
    const tag = this.add.text(cx, tagY, 'S U R V I V E   T H E   N E O N', {
      fontSize: '8px', fontFamily: 'monospace', color: '#253340', letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);
    floatAll.push(tag);
    this.time.delayedCall(1100, () =>
      this.tweens.add({ targets: tag, alpha: 0.55, duration: 600 }));

    /* ── Float bob starts after all characters have settled ── */
    this.time.delayedCall(1300, () => {
      this.tweens.add({
        targets: floatAll,
        y: '-=7',
        duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    /* ── Periodic neon-label flicker ── */
    this.time.addEvent({
      delay: 3200, loop: true,
      callback: () => {
        if (this.glitchActive) return;
        neonLetters.forEach((lt, i) =>
          this.time.delayedCall(i * 40, () =>
            this.tweens.add({ targets: lt, alpha: { from: 1, to: 0.15 }, duration: 50, yoyo: true })));
      },
    });
  }

  /* --------------------------------------------------------
     GLITCH — RGB-split flash on title
  -------------------------------------------------------- */
  private _fireGlitch() {
    this.glitchActive = true;
    const W = GAME_WIDTH;
    const texts  = ['NEON', 'DODGE'];
    const yPos   = [GAME_HEIGHT * 0.167, GAME_HEIGHT * 0.232];
    const sizes  = ['22px', '72px'];
    const tints  = ['#ff0044', '#00ffff', '#ffee00'];

    for (const tint of tints) {
      for (let l = 0; l < 2; l++) {
        const ox = Phaser.Math.Between(-8, 8);
        const oy = Phaser.Math.Between(-3, 3);
        const gt = this.add.text(W / 2 + ox, yPos[l] + oy, texts[l], {
          fontSize: sizes[l],
          fontFamily: '"Arial Black", "Arial Bold", sans-serif',
          fontStyle: 'bold',
          color: tint,
        }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25);
        this.glitchTexts.push(gt);
      }
    }

    const shift = Phaser.Math.Between(-5, 5);
    const origN = this.titleNeon.x, origD = this.titleDodge.x;
    this.titleNeon.x  = origN + shift;
    this.titleDodge.x = origD - shift;

    this.time.delayedCall(65 + Math.random() * 110, () => {
      this.glitchTexts.forEach(gt => gt.destroy());
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
     FLOATING PLAYER PREVIEW  —  rocket (matches GameScene)
  -------------------------------------------------------- */
  private _buildFloatingPlayer() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const skin = SKINS[this.selectedSkin];
    const cx = W / 2, cy = H * 0.495;
    this.floatingPlayerCX = cx;
    this.floatingPlayerCY = cy;

    /* Outer glow ring (stays as arc, cosmetic only) */
    const glow = this.add.circle(cx, cy, 30, skin.color, 0.08);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.02 }, scaleX: 1.2, scaleY: 1.2,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* Build graphics object so we can redraw on skin change */
    this.floatingPlayerGfx = this.add.graphics();
    this._drawRocketGfx(this.floatingPlayerGfx, skin.color);

    this.floatingPlayer = this.add.container(cx, cy, [this.floatingPlayerGfx]);

    /* Float bob tween — animates the container */
    this.tweens.add({
      targets: [this.floatingPlayer, glow],
      y: '-=12',
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  /* Draw (or redraw) the rocket Graphics relative to (0,0) */
  private _drawRocketGfx(g: Phaser.GameObjects.Graphics, color: number) {
    const col   = color;
    const dark  = Phaser.Display.Color.IntegerToColor(col).darken(30).color;
    const light = Phaser.Display.Color.IntegerToColor(col).lighten(40).color;

    g.clear();

    /* Nose cone */
    g.fillStyle(light, 1);
    g.fillTriangle(-9, -10, 9, -10, 0, -26);

    /* Body */
    g.fillStyle(col, 1);
    g.fillRect(-8, -10, 16, 23);

    /* Cockpit window */
    g.fillStyle(0x000000, 0.6);
    g.fillCircle(0, -4, 5);
    g.fillStyle(0x88eeff, 0.9);
    g.fillCircle(0, -4, 3.5);

    /* Left fin */
    g.fillStyle(dark, 1);
    g.fillTriangle(-8, 3, -18, 13, -8, 13);

    /* Right fin */
    g.fillTriangle(8, 3, 18, 13, 8, 13);

    /* Nozzle */
    g.fillStyle(0x222244, 1);
    g.fillRect(-6, 13, 12, 5);

    /* Neon outline */
    g.lineStyle(1, col, 0.7);
    g.strokeRect(-8, -10, 16, 23);
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

      dot.on('pointerover', () => { if (i !== this.selectedSkin) dot.setRadius(8).setAlpha(0.75); });
      dot.on('pointerout',  () => { if (i !== this.selectedSkin) dot.setRadius(6).setAlpha(0.45); });
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
      const isSel = i === this.selectedSkin;
      this.skinDots[i].setRadius(isSel ? 10 : 6).setAlpha(isSel ? 1 : 0.45);
      this.skinRings[i].setRadius(isSel ? 14 : 11)
        .setStrokeStyle(isSel ? 2 : 1, col, isSel ? 0.9 : 0.3);
    }
  }

  private _updateFloatingPlayerColor() {
    const col = SKINS[this.selectedSkin].color;
    /* Redraw rocket graphics with new skin color */
    this._drawRocketGfx(this.floatingPlayerGfx, col);
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
      targets: [glow, btn], alpha: { from: 1, to: 0.4 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: label, alpha: { from: 1, to: 0.55 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 80,
    });

    const _start = () => {
      localStorage.setItem(STORAGE_SKIN, String(this.selectedSkin));
      this.tweens.add({
        targets: [btn, glow, label], scaleX: 1.06, scaleY: 1.06, alpha: 1,
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
    const maxCombo  = parseInt(localStorage.getItem(STORAGE_MAX_COMBO)    || '0', 10);
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
