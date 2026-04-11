
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
  private floatingPlayer!: Phaser.GameObjects.Arc;
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
      const dot = this.add.circle(
        this.floatingPlayer.x + Phaser.Math.Between(-4, 4),
        this.floatingPlayer.y + Phaser.Math.Between(-4, 4),
        Phaser.Math.Between(2, 5), skin.color, 0.5,
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

    /*
      Layout (700px canvas):
        60px  → top rule / diamond
        81px  → "N · E · O · N" label
        116px → "NEON" (mid-weight, cyan)
        215px → "DODGE" hero (center-of-mass)
        270px → bottom rule / diamond + tagline
    */
    const topRuleY  = H * 0.086;   // 60px
    const neonLblY  = H * 0.116;   // 81px
    const neonWordY = H * 0.167;   // 117px
    const dodgeY    = H * 0.232;   // 162px
    const botRuleY  = H * 0.290;   // 203px
    const tagY      = H * 0.318;   // 223px

    /* ── Decorative Graphics container ── */
    const g = this.add.graphics();

    /* Top rule: two lines flanking a diamond */
    const ruleSpan = 88;
    g.lineStyle(1, 0x00eeff, 0.45);
    g.lineBetween(cx - ruleSpan, topRuleY, cx - 7, topRuleY);
    g.lineBetween(cx + 7,        topRuleY, cx + ruleSpan, topRuleY);
    _diamond(g, cx, topRuleY, 5, 0x00eeff, 0.75);

    /* Corner ticks (tiny vertical dashes at ends of top rule) */
    g.lineStyle(1, 0x00eeff, 0.3);
    g.lineBetween(cx - ruleSpan, topRuleY - 4, cx - ruleSpan, topRuleY + 4);
    g.lineBetween(cx + ruleSpan, topRuleY - 4, cx + ruleSpan, topRuleY + 4);

    /* Bottom rule: pink, wider */
    const botSpan = 108;
    g.lineStyle(1, 0xff22aa, 0.4);
    g.lineBetween(cx - botSpan, botRuleY, cx - 7, botRuleY);
    g.lineBetween(cx + 7,       botRuleY, cx + botSpan, botRuleY);
    _diamond(g, cx, botRuleY, 5, 0xff22aa, 0.65);
    g.lineStyle(1, 0xff22aa, 0.25);
    g.lineBetween(cx - botSpan, botRuleY - 4, cx - botSpan, botRuleY + 4);
    g.lineBetween(cx + botSpan, botRuleY - 4, cx + botSpan, botRuleY + 4);

    /* ── "N · E · O · N" tiny spaced label ── */
    const neonLbl = this.add.text(cx, neonLblY, 'N  ·  E  ·  O  ·  N', {
      fontSize: '10px', fontFamily: 'monospace', color: '#00eeff', letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0);

    /* ── "NEON" word — cyan, 22px, clean 1px stroke ── */
    this.titleNeon = this.add.text(cx, neonWordY, 'NEON', {
      fontSize: '22px',
      fontFamily: '"Arial Black", "Arial Bold", sans-serif',
      fontStyle: 'bold',
      color: '#00eeff',
      stroke: '#00eeff',
      strokeThickness: 1,
      shadow: { color: '#00eeff', blur: 20, fill: true, stroke: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5).setAlpha(0);

    /* ── "DODGE" hero — three layers, no thick box ── */
    /* Layer 1: outer glow — NO stroke (avoids boxy halo), just fill at low alpha */
    const d1 = this.add.text(cx, dodgeY, 'DODGE', {
      fontSize: '76px',
      fontFamily: '"Arial Black", "Arial Bold", sans-serif',
      fontStyle: 'bold',
      color: '#ff44cc',
    }).setOrigin(0.5).setAlpha(0.10);

    /* Layer 2: mid glow — no stroke */
    const d2 = this.add.text(cx, dodgeY, 'DODGE', {
      fontSize: '73px',
      fontFamily: '"Arial Black", "Arial Bold", sans-serif',
      fontStyle: 'bold',
      color: '#ff22aa',
    }).setOrigin(0.5).setAlpha(0.22);

    /* Layer 3: main crisp white text, 1px pink stroke */
    this.titleDodge = this.add.text(cx, dodgeY, 'DODGE', {
      fontSize: '72px',
      fontFamily: '"Arial Black", "Arial Bold", sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff22aa',
      strokeThickness: 1,
      shadow: { color: '#ff22aa', blur: 22, fill: true, stroke: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5).setAlpha(0);

    /* ── Tagline ── */
    const tag = this.add.text(cx, tagY, 'S U R V I V E   T H E   N E O N', {
      fontSize: '8px', fontFamily: 'monospace', color: '#253340', letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);

    /* ── Entry sequence ── */
    this.tweens.add({ targets: neonLbl,        alpha: 0.85, duration: 380, delay: 0 });
    this.tweens.add({ targets: this.titleNeon,  alpha: 1,    duration: 420, ease: 'Power2', delay: 80 });
    this.tweens.add({ targets: [d1, d2],        alpha: 1,    duration: 500, delay: 140,
      onComplete: () => { d1.setAlpha(0.12); d2.setAlpha(0.28); } });
    this.tweens.add({ targets: this.titleDodge, alpha: 1,    duration: 500, ease: 'Power2', delay: 160 });
    this.tweens.add({ targets: tag,             alpha: 0.65, duration: 500, delay: 300 });

    /* ── Continuous float bob ── */
    this.tweens.add({
      targets: [g, neonLbl, this.titleNeon, d1, d2, this.titleDodge, tag],
      y: '-=7',
      duration: 2100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* ── Glow breathe ── */
    this.tweens.add({
      targets: d1,
      alpha: { from: 0.12, to: 0.26 },
      duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* ── Flicker shimmer on neonLbl ── */
    this.time.addEvent({
      delay: 3000, loop: true,
      callback: () => {
        if (this.glitchActive) return;
        this.tweens.add({
          targets: neonLbl,
          alpha: { from: 0.85, to: 0.1 },
          duration: 55, yoyo: true, repeat: 2,
        });
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
