
/* =========================================================
   START SCENE — Awwwards-level redesign
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

  /* Glitch objects (title copies) */
  private glitchObjs: Phaser.GameObjects.Text[] = [];
  private glitchTimer = 0;
  private glitchActive = false;

  /* Title refs for glow pulse */
  private titleGlows: Phaser.GameObjects.Text[] = [];

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

    /* ── Title ─────────────────────────────────────────── */
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

    /* Glitch cycle: every ~4 s, glitch fires for 100-200ms */
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
    const vX = W / 2, vY = H * 0.58; // vanishing point

    /* Horizontal lines — exponentially spaced to give depth */
    const hCount = 10;
    for (let i = 0; i <= hCount; i++) {
      const t = (i / hCount) ** 1.8; // curve toward horizon
      const y = vY + (H - vY) * t;
      const alpha = 0.06 + t * 0.18;
      g.lineStyle(1, 0x00aaff, alpha);
      g.lineBetween(0, y, W, y);
    }

    /* Vertical lines radiating from vanishing point */
    const vCount = 12;
    for (let i = 0; i <= vCount; i++) {
      const bx = (i / vCount) * W;
      const alpha = 0.06 + 0.10 * Math.abs(i - vCount / 2) / (vCount / 2);
      g.lineStyle(1, 0x00aaff, alpha);
      g.lineBetween(vX, vY, bx, H);
    }

    /* Flat grid for upper half (very faint) */
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
     TITLE — layered glow + entry animation
  -------------------------------------------------------- */
  private _buildTitle() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const nY = H * 0.155, dY = H * 0.265;

    /* Glow halos (deep blur layers) */
    const haloNeon = this.add.text(W / 2, nY, 'NEON', {
      fontSize: '74px', fontFamily: 'monospace',
      color: '#003344', stroke: '#00ffff', strokeThickness: 28, alpha: 0.18,
    }).setOrigin(0.5).setAlpha(0.18);

    const haloDodge = this.add.text(W / 2, dY, 'DODGE', {
      fontSize: '74px', fontFamily: 'monospace',
      color: '#330011', stroke: '#ff2060', strokeThickness: 28, alpha: 0.18,
    }).setOrigin(0.5).setAlpha(0.18);

    /* Mid glow */
    const midNeon = this.add.text(W / 2, nY, 'NEON', {
      fontSize: '74px', fontFamily: 'monospace',
      color: '#005566', stroke: '#00ffff', strokeThickness: 10, alpha: 0.35,
    }).setOrigin(0.5).setAlpha(0.35);

    const midDodge = this.add.text(W / 2, dY, 'DODGE', {
      fontSize: '74px', fontFamily: 'monospace',
      color: '#440022', stroke: '#ff2060', strokeThickness: 10, alpha: 0.35,
    }).setOrigin(0.5).setAlpha(0.35);

    /* Crisp top layer */
    const neon = this.add.text(W / 2, nY, 'NEON', {
      fontSize: '74px', fontFamily: 'monospace', color: '#00ffff',
      stroke: '#00ffff', strokeThickness: 1,
    }).setOrigin(0.5);

    const dodge = this.add.text(W / 2, dY, 'DODGE', {
      fontSize: '74px', fontFamily: 'monospace', color: '#ff2060',
      stroke: '#ff2060', strokeThickness: 1,
    }).setOrigin(0.5);

    this.titleGlows = [haloNeon, haloDodge, midNeon, midDodge, neon, dodge];

    /* Breathing glow on halos */
    this.tweens.add({
      targets: [haloNeon, haloDodge],
      alpha: { from: 0.18, to: 0.38 },
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: [midNeon, midDodge],
      alpha: { from: 0.35, to: 0.65 },
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: 200,
    });

    /* Entry: NEON slides from left, DODGE from right */
    const targets = [haloNeon, midNeon, neon];
    const targetsD = [haloDodge, midDodge, dodge];

    targets.forEach(t => { t.x = -W * 0.3; });
    targetsD.forEach(t => { t.x = W * 1.3; });

    this.tweens.add({
      targets, x: W / 2,
      duration: 550, ease: 'Back.Out', delay: 50,
    });
    this.tweens.add({
      targets: targetsD, x: W / 2,
      duration: 550, ease: 'Back.Out', delay: 120,
    });
  }

  /* --------------------------------------------------------
     GLITCH — RGB-split flash on title
  -------------------------------------------------------- */
  private _fireGlitch() {
    this.glitchActive = true;
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const words  = ['NEON', 'DODGE'];
    const yPos   = [H * 0.155, H * 0.265];
    const colors = ['#ff0044', '#00ffff', '#ffff00'];

    /* Create 2-3 offset ghost copies */
    for (let pass = 0; pass < 3; pass++) {
      words.forEach((word, wi) => {
        const c = colors[pass % colors.length];
        const ox = Phaser.Math.Between(-8, 8);
        const oy = Phaser.Math.Between(-3, 3);
        const g = this.add.text(W / 2 + ox, yPos[wi] + oy, word, {
          fontSize: '74px', fontFamily: 'monospace',
          color: c, alpha: 0.45,
        }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);
        this.glitchObjs.push(g);
      });
    }

    /* Kill ghosts after short delay */
    const dur = 80 + Math.random() * 140;
    this.time.delayedCall(dur, () => {
      this.glitchObjs.forEach(g => g.destroy());
      this.glitchObjs = [];
      this.glitchActive = false;
      this.glitchTimer = 0;
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
    div.lineBetween(W * 0.15, H * 0.355, W * 0.85, H * 0.355);

    if (hi > 0) {
      this.add.text(W / 2, H * 0.38, `★  BEST  ${hi}`, {
        fontSize: '15px', fontFamily: 'monospace', color: '#33aacc',
        stroke: '#006688', strokeThickness: 1,
      }).setOrigin(0.5);
    } else {
      this.add.text(W / 2, H * 0.38, 'NO RECORD YET', {
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
    const cx = W / 2, cy = H * 0.478;

    /* Orbit ring */
    const ring = this.add.circle(cx, cy, 28, 0x000000, 0)
      .setStrokeStyle(1, skin.color, 0.14);

    /* Outer glow */
    const glow = this.add.circle(cx, cy, 22, skin.color, 0.12);

    /* Inner glow */
    const inner = this.add.circle(cx, cy, 16, skin.color, 0.3);

    /* Crisp dot */
    this.floatingPlayer = this.add.circle(cx, cy, 13, skin.color, 1);

    /* Pulsing glow tween */
    this.tweens.add({
      targets: [glow, inner, ring],
      alpha: { from: glow.alpha, to: glow.alpha * 0.2 },
      scaleX: 1.15, scaleY: 1.15,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* Float bob */
    this.tweens.add({
      targets: [this.floatingPlayer, glow, inner, ring],
      y: `-=12`,
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  /* --------------------------------------------------------
     SKIN DOT SELECTOR
  -------------------------------------------------------- */
  private _buildSkinSelector() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cy = H * 0.565;
    const spacing = 38;
    const total = SKINS.length;
    const startX = W / 2 - ((total - 1) / 2) * spacing;

    this.add.text(W / 2, cy - 22, 'SELECT SKIN', {
      fontSize: '10px', fontFamily: 'monospace', color: '#223344', letterSpacing: 3,
    }).setOrigin(0.5);

    this.skinDots = [];
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
        if (i !== this.selectedSkin) {
          dot.setRadius(8);
          dot.setAlpha(0.75);
        }
      });
      dot.on('pointerout', () => {
        if (i !== this.selectedSkin) {
          dot.setRadius(6);
          dot.setAlpha(0.45);
        }
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
    const cx = W / 2, cy = H * 0.682;

    /* Outer glow rectangle */
    const glow = this.add.rectangle(cx, cy, 210, 54, 0x00ffff, 0.04)
      .setStrokeStyle(1, 0x00ffff, 0.18);

    /* Inner button */
    const btn = this.add.rectangle(cx, cy, 196, 46, 0x000000, 0)
      .setStrokeStyle(2, 0x00ffff, 0.85)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(cx, cy, '▶   PLAY', {
      fontSize: '20px', fontFamily: 'monospace', color: '#00ffff',
      stroke: '#00ffff', strokeThickness: 1,
    }).setOrigin(0.5);

    /* Breathing pulse on button outline */
    this.tweens.add({
      targets: [glow, btn],
      alpha: { from: 1, to: 0.4 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: label,
      alpha: { from: 1, to: 0.55 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: 80,
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

    /* Also tap anywhere (not on interactive objects) */
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

    /* Divider */
    const dg = this.add.graphics();
    dg.lineStyle(1, 0x00ffff, 0.07);
    dg.lineBetween(W * 0.12, cy - 20, W * 0.88, cy - 20);

    const col = (x: number, value: string, label: string) => {
      this.add.text(x, cy - 8, value, {
        fontSize: '14px', fontFamily: 'monospace', color: '#334d5c',
      }).setOrigin(0.5);
      this.add.text(x, cy + 10, label, {
        fontSize: '9px', fontFamily: 'monospace', color: '#1e2e38', letterSpacing: 1,
      }).setOrigin(0.5);
    };

    col(W * 0.22, `${gamesPlayed}`, 'GAMES');
    col(W * 0.50, `${Math.floor(totalTime)}s`, 'TOTAL TIME');
    col(W * 0.78, `${maxCombo}`, 'BEST COMBO');
  }
}
