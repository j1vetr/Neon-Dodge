
/* =========================================================
   START SCENE — Awwwards-style neon menu
   NEON DODGE title preserved exactly.
   Lower section fully redesigned: card + big play button.
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLOR_BG, SKINS,
  STORAGE_HIGHSCORE, STORAGE_SKIN,
  STORAGE_GAMES_PLAYED, STORAGE_TOTAL_TIME, STORAGE_MAX_COMBO,
} from '../constants';
import { getLang, setLang, t } from '../i18n';

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
  private floatingPlayerImg!: Phaser.GameObjects.Image;
  private playerTrail: Phaser.GameObjects.Arc[] = [];
  private playerTrailTimer = 0;

  /* Title refs for glitch */
  private glitchTimer  = 0;
  private glitchActive = false;
  private titleNeon!: Phaser.GameObjects.Text;
  private titleDodge!: Phaser.GameObjects.Text;
  private glitchTexts: Phaser.GameObjects.Text[] = [];

  /* Card / color selector */
  private skinGfx!: Phaser.GameObjects.Graphics;
  private cardBorderGfx!: Phaser.GameObjects.Graphics;
  private skinNameLabels: Phaser.GameObjects.Text[] = [];
  private selectedColorTxt!: Phaser.GameObjects.Text;
  private readonly TILE = 32;
  private readonly TGAP = 52;
  private tileY = 0;
  private tileX0 = 0;

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

    this.selectedSkin = parseInt(localStorage.getItem(STORAGE_SKIN) || '0', 10);

    this._buildBestScore();
    this._buildMainCard();
    this._buildPlayButton();
    this._buildFooter();

    this.add.text(W - 10, H - 10, 'v2', {
      fontSize: '9px', fontFamily: 'monospace', color: '#111e28',
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
      const flameColors = [skin.color, 0xffffff, 0xff8800, 0xffff00];
      const fCol = flameColors[Math.floor(Math.random() * flameColors.length)];
      const dot = this.add.circle(
        this.floatingPlayer.x + Phaser.Math.Between(-4, 4),
        this.floatingPlayer.y + 27 + Phaser.Math.Between(0, 5),
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
      const t2 = (i / 10) ** 1.8;
      const y = vY + (H - vY) * t2;
      g.lineStyle(1, 0x00aaff, 0.06 + t2 * 0.18);
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
     TITLE  (preserved exactly)
  -------------------------------------------------------- */
  private _buildTitle() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2;

    const neonY  = H * 0.148;
    const dodgeY = H * 0.242;
    const tagY   = H * 0.324;

    const dg = this.add.graphics();
    dg.lineStyle(1, 0x00eeff, 0.38);
    dg.lineBetween(cx - 102, neonY - 24, cx - 8, neonY - 24);
    dg.lineBetween(cx +   8, neonY - 24, cx + 102, neonY - 24);
    _diamond(dg, cx, neonY - 24, 4, 0x00eeff, 0.7);
    dg.lineStyle(1, 0xff22aa, 0.35);
    dg.lineBetween(cx - 122, dodgeY + 52, cx - 8, dodgeY + 52);
    dg.lineBetween(cx +   8, dodgeY + 52, cx + 122, dodgeY + 52);
    _diamond(dg, cx, dodgeY + 52, 4, 0xff22aa, 0.6);

    const SCRAMBLE = '!@#&%ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const floatAll: Phaser.GameObjects.GameObject[] = [dg];
    const BG = '#050510';

    const spawnChar = (
      ch: string, x: number, y: number,
      outlineColor: string,
      mainPx: number, strokeW: number,
      startDelay: number,
    ): Phaser.GameObjects.Text => {
      const lc = this.add.text(x, y, ch, {
        fontSize: `${mainPx}px`,
        fontFamily: '"Orbitron", monospace',
        fontStyle: 'bold',
        color: BG,
        stroke: outlineColor,
        strokeThickness: strokeW,
        shadow: { color: outlineColor, blur: 10, fill: false, stroke: true, offsetX: 0, offsetY: 0 },
      }).setOrigin(0.5).setAlpha(0);

      this.time.delayedCall(startDelay, () => {
        lc.setAlpha(1.0);
        let tick = 0;
        const reps = 5 + Math.floor(Math.random() * 4);
        const ev = this.time.addEvent({
          delay: 55, repeat: reps,
          callback: () => {
            lc.setText(SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]);
            if (++tick >= reps) {
              lc.setText(ch);
              this.tweens.add({
                targets: lc,
                alpha: { from: 1.0, to: 0.55 },
                duration: 90, yoyo: true,
                onComplete: () => {
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

    const NEON = ['N', 'E', 'O', 'N'];
    const nSp = 28, nSt = cx - ((NEON.length - 1) / 2) * nSp;
    const neonLetters = NEON.map((ch, i) =>
      spawnChar(ch, nSt + i * nSp, neonY, '#00eeff', 24, 1.5, 40 + i * 80));
    this.titleNeon = neonLetters[neonLetters.length - 1];

    const DODGE = ['D', 'O', 'D', 'G', 'E'];
    const dSp = 56, dSt = cx - ((DODGE.length - 1) / 2) * dSp;
    const dodgeLetters = DODGE.map((ch, i) =>
      spawnChar(ch, dSt + i * dSp, dodgeY, '#ff22aa', 66, 2, 280 + i * 75));
    this.titleDodge = dodgeLetters[dodgeLetters.length - 1];

    const tag = this.add.text(cx, tagY, 'S U R V I V E   T H E   N E O N', {
      fontSize: '8px', fontFamily: 'monospace', color: '#253340', letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);
    floatAll.push(tag);
    this.time.delayedCall(1100, () =>
      this.tweens.add({ targets: tag, alpha: 0.55, duration: 600 }));

    this.time.delayedCall(1300, () => {
      this.tweens.add({
        targets: floatAll,
        y: '-=7',
        duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

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
     GLITCH  (preserved exactly)
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
     BEST SCORE  — elegant single line below title
  -------------------------------------------------------- */
  private _buildBestScore() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const hi = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    const y = H * 0.393;

    /* glow separator line */
    const g = this.add.graphics();
    g.lineStyle(1, 0x00ffff, 0.1);
    g.lineBetween(W * 0.1, y - 14, W * 0.9, y - 14);

    if (hi > 0) {
      this.add.text(W / 2, y, `★  ${t().best.toUpperCase()}  ${hi}`, {
        fontSize: '14px', fontFamily: '"Orbitron", monospace',
        fontStyle: 'bold',
        color: '#050510', stroke: '#00ddcc', strokeThickness: 1.2,
        shadow: { color: '#00ffcc', blur: 8, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
      }).setOrigin(0.5);
    } else {
      this.add.text(W / 2, y, t().noRecord, {
        fontSize: '11px', fontFamily: 'monospace', color: '#1a3040', letterSpacing: 2,
      }).setOrigin(0.5);
    }
  }

  /* --------------------------------------------------------
     MAIN CARD  — rocket preview + color selector
  -------------------------------------------------------- */
  private _buildMainCard() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* Card geometry */
    const CX = W / 2;
    const CARD_TOP  = H * 0.428;
    const CARD_H    = 222;
    const CARD_W    = W - 40;
    const CARD_CY   = CARD_TOP + CARD_H / 2;
    const R         = 14;

    /* ── Card background ── */
    const cbg = this.add.graphics();
    cbg.fillStyle(0x07071a, 0.82);
    cbg.fillRoundedRect(W / 2 - CARD_W / 2, CARD_TOP, CARD_W, CARD_H, R);

    /* ── Card border (updates color with selection) ── */
    this.cardBorderGfx = this.add.graphics();
    this._drawCardBorder(CARD_W, CARD_TOP, CARD_H, R);

    /* ── Top accent line inside card ── */
    const topLine = this.add.graphics();
    topLine.lineStyle(1, 0x00ffff, 0.18);
    topLine.lineBetween(W / 2 - CARD_W / 2 + R, CARD_TOP + 1, W / 2 + CARD_W / 2 - R, CARD_TOP + 1);

    /* ── Rocket preview ── */
    const rocketY = CARD_TOP + 62;
    const skin = SKINS[this.selectedSkin];

    const rocketGlow = this.add.circle(CX, rocketY, 32, skin.color, 0.08);
    this.tweens.add({
      targets: rocketGlow,
      alpha: { from: 0.08, to: 0.02 }, scaleX: 1.3, scaleY: 1.3,
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.floatingPlayerImg = this.add.image(0, 0, 'player-rocket')
      .setDisplaySize(52, 60)
      .setTint(skin.color);

    this.floatingPlayer = this.add.container(CX, rocketY, [this.floatingPlayerImg]);

    this.tweens.add({
      targets: [this.floatingPlayer, rocketGlow],
      y: '-=10',
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* ── Selected color name (big, bold, skin color) ── */
    this.selectedColorTxt = this.add.text(CX, CARD_TOP + 112, t().skinNames[this.selectedSkin], {
      fontSize: '20px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: skin.hex,
      stroke: skin.hex,
      strokeThickness: 0.8,
      shadow: { color: skin.hex, blur: 14, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);

    /* ── Divider + "RENK SEÇ" label ── */
    const divY = CARD_TOP + 136;
    const dg2 = this.add.graphics();
    dg2.lineStyle(1, 0x00ffff, 0.1);
    dg2.lineBetween(W / 2 - 110, divY, W / 2 + 110, divY);

    this.add.text(CX, divY + 14, t().selectSkin, {
      fontSize: '9px', fontFamily: 'monospace', color: '#2e4455', letterSpacing: 4,
    }).setOrigin(0.5);

    /* ── Color tiles ── */
    const TILE = this.TILE, TGAP = this.TGAP;
    const tileY = CARD_TOP + 178;
    const tileX0 = CX - ((SKINS.length - 1) / 2) * TGAP;
    this.tileY  = tileY;
    this.tileX0 = tileX0;

    this.skinGfx = this.add.graphics();
    this.skinNameLabels = [];

    for (let i = 0; i < SKINS.length; i++) {
      const x = tileX0 + i * TGAP;
      const isSel = i === this.selectedSkin;

      /* Name label */
      const lbl = this.add.text(x, tileY + TILE / 2 + 12, t().skinNames[i], {
        fontSize: '8px', fontFamily: 'monospace',
        color: isSel ? SKINS[i].hex : '#1e3040',
      }).setOrigin(0.5);
      this.skinNameLabels.push(lbl);

      /* Hit area */
      const hit = this.add.rectangle(x, tileY + 8, TILE + 14, TILE + 30, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (i !== this.selectedSkin) hit.setFillStyle(0xffffff, 0.05); });
      hit.on('pointerout',  () => hit.setFillStyle(0xffffff, 0));
      hit.on('pointerdown', () => {
        this.selectedSkin = i;
        this._refreshSelector();
        this._updateRocketColor();
      });
    }

    this._drawTiles();

    void CARD_CY; void cbg; void topLine;
  }

  /* ── Card border (skin-tinted) ── */
  private _drawCardBorder(CW: number, CT: number, CH: number, R: number) {
    const g = this.cardBorderGfx;
    g.clear();
    const col = SKINS[this.selectedSkin].color;
    g.lineStyle(1.5, col, 0.35);
    g.strokeRoundedRect(GAME_WIDTH / 2 - CW / 2, CT, CW, CH, R);
  }

  /* ── Color tiles ── */
  private _drawTiles() {
    const g = this.skinGfx;
    g.clear();
    const S = this.TILE, sp = this.TGAP;
    const cy = this.tileY, startX = this.tileX0;
    const r = 6;

    for (let i = 0; i < SKINS.length; i++) {
      const x = startX + i * sp;
      const col = SKINS[i].color;
      const sel = i === this.selectedSkin;
      const h = S / 2;

      if (sel) {
        g.lineStyle(8, col, 0.05);
        g.strokeRoundedRect(x - h - 7, cy - h - 7, S + 14, S + 14, r + 4);
        g.lineStyle(4, col, 0.14);
        g.strokeRoundedRect(x - h - 4, cy - h - 4, S + 8,  S + 8,  r + 2);
        g.lineStyle(2, col, 0.5);
        g.strokeRoundedRect(x - h - 1, cy - h - 1, S + 2,  S + 2,  r + 1);
        g.fillStyle(col, 1);
        g.fillRoundedRect(x - h, cy - h, S, S, r);
        g.lineStyle(1.5, 0xffffff, 0.45);
        g.strokeRoundedRect(x - h + 2, cy - h + 2, S - 4, S - 4, r - 2);
      } else {
        g.fillStyle(col, 0.16);
        g.fillRoundedRect(x - h, cy - h, S, S, r);
        g.lineStyle(1, col, 0.3);
        g.strokeRoundedRect(x - h, cy - h, S, S, r);
      }
    }
  }

  private _refreshSelector() {
    const H = GAME_HEIGHT;
    const CARD_TOP  = H * 0.428;
    const CARD_H    = 222;
    const CARD_W    = GAME_WIDTH - 40;
    this._drawCardBorder(CARD_W, CARD_TOP, CARD_H, 14);
    this._drawTiles();

    const skin = SKINS[this.selectedSkin];
    this.selectedColorTxt.setText(t().skinNames[this.selectedSkin]);
    this.selectedColorTxt.setColor(skin.hex);
    this.selectedColorTxt.setStroke(skin.hex, 0.8);

    for (let i = 0; i < SKINS.length; i++) {
      this.skinNameLabels[i].setColor(
        i === this.selectedSkin ? SKINS[i].hex : '#1e3040'
      );
    }
  }

  private _updateRocketColor() {
    const col = SKINS[this.selectedSkin].color;
    this.floatingPlayerImg.setTint(col);
    this.playerTrail.forEach(d => d.setFillStyle(col));
  }

  /* --------------------------------------------------------
     PLAY BUTTON  — full-width, bold, neon
  -------------------------------------------------------- */
  private _buildPlayButton() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const CX = W / 2;
    const cy  = H * 0.732;
    const BW  = W - 48;
    const BH  = 58;

    /* outer glow shell */
    const glow = this.add.graphics();
    glow.lineStyle(12, 0x00ffff, 0.06);
    glow.strokeRoundedRect(CX - BW / 2 - 6, cy - BH / 2 - 6, BW + 12, BH + 12, 14);
    glow.lineStyle(4, 0x00ffff, 0.12);
    glow.strokeRoundedRect(CX - BW / 2 - 2, cy - BH / 2 - 2, BW + 4, BH + 4, 12);

    /* fill */
    const fill = this.add.graphics();
    fill.fillStyle(0x00ffff, 0.07);
    fill.fillRoundedRect(CX - BW / 2, cy - BH / 2, BW, BH, 10);

    /* border */
    const border = this.add.graphics();
    border.lineStyle(2, 0x00ffff, 1);
    border.strokeRoundedRect(CX - BW / 2, cy - BH / 2, BW, BH, 10);

    /* text */
    const label = this.add.text(CX, cy, t().play, {
      fontSize: '22px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: '#050510',
      stroke: '#00ffff',
      strokeThickness: 1.5,
      shadow: { color: '#00ffff', blur: 10, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);

    /* invisible hit area */
    const btn = this.add.rectangle(CX, cy, BW, BH, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    /* pulse animation */
    this.tweens.add({
      targets: [fill, border], alpha: { from: 1, to: 0.45 },
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: label, alpha: { from: 1, to: 0.55 },
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 100,
    });

    const _start = () => {
      localStorage.setItem(STORAGE_SKIN, String(this.selectedSkin));
      this.tweens.add({
        targets: [border, fill, label], scaleX: 1.04, scaleY: 1.04, alpha: 1,
        duration: 75, yoyo: true,
        onComplete: () => this.scene.start('GameScene', { skin: this.selectedSkin }),
      });
    };

    btn.on('pointerdown', _start);
    label.setInteractive({ useHandCursor: true }).on('pointerdown', _start);

    void glow;
  }

  /* --------------------------------------------------------
     FOOTER  — lang flags + stats (minimal)
  -------------------------------------------------------- */
  private _buildFooter() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const CX = W / 2;
    const lang = getLang();
    const FLAG_SIZE = 22;
    const flagGap   = 18;

    /* ── Language flags ── */
    const flagY = H * 0.824;

    const flagTr = this.add.image(CX - flagGap - FLAG_SIZE / 2, flagY, 'flag-tr')
      .setDisplaySize(FLAG_SIZE, FLAG_SIZE).setInteractive({ useHandCursor: true });
    const flagEn = this.add.image(CX + flagGap + FLAG_SIZE / 2, flagY, 'flag-en')
      .setDisplaySize(FLAG_SIZE, FLAG_SIZE).setInteractive({ useHandCursor: true });

    const bsTr = flagTr.scaleX;
    const bsEn = flagEn.scaleX;

    const ringTr = this.add.circle(flagTr.x, flagY, FLAG_SIZE / 2 + 3, 0x000000, 0)
      .setStrokeStyle(lang === 'tr' ? 1.5 : 0, 0x00ffff, 0.9);
    const ringEn = this.add.circle(flagEn.x, flagY, FLAG_SIZE / 2 + 3, 0x000000, 0)
      .setStrokeStyle(lang === 'en' ? 1.5 : 0, 0x00ffff, 0.9);

    flagTr.setAlpha(lang === 'tr' ? 1 : 0.35);
    flagEn.setAlpha(lang === 'en' ? 1 : 0.35);

    const _switch = (l: 'tr' | 'en') => { if (getLang() !== l) { setLang(l); this.scene.restart(); } };
    flagTr.on('pointerdown', () => _switch('tr'));
    flagEn.on('pointerdown', () => _switch('en'));
    flagTr.on('pointerover', () => { if (lang !== 'tr') { flagTr.setAlpha(0.7); flagTr.setScale(bsTr * 1.06); } });
    flagTr.on('pointerout',  () => { if (lang !== 'tr') { flagTr.setAlpha(0.35); flagTr.setScale(bsTr); } });
    flagEn.on('pointerover', () => { if (lang !== 'en') { flagEn.setAlpha(0.7); flagEn.setScale(bsEn * 1.06); } });
    flagEn.on('pointerout',  () => { if (lang !== 'en') { flagEn.setAlpha(0.35); flagEn.setScale(bsEn); } });

    void ringTr; void ringEn;

    /* ── Lifetime stats (only if played before) ── */
    const gamesPlayed = parseInt(localStorage.getItem(STORAGE_GAMES_PLAYED) || '0', 10);
    if (gamesPlayed === 0) return;

    const totalTime = parseFloat(localStorage.getItem(STORAGE_TOTAL_TIME) || '0');
    const maxCombo  = parseInt(localStorage.getItem(STORAGE_MAX_COMBO)    || '0', 10);

    const statY = H * 0.875;

    const dg = this.add.graphics();
    dg.lineStyle(1, 0x00ffff, 0.07);
    dg.lineBetween(W * 0.15, statY - 18, W * 0.85, statY - 18);

    const statCol = (x: number, val: string, lbl: string) => {
      this.add.text(x, statY, val, {
        fontSize: '13px', fontFamily: 'monospace', color: '#4d6677',
        stroke: '#002233', strokeThickness: 1,
      }).setOrigin(0.5);
      this.add.text(x, statY + 16, lbl, {
        fontSize: '8px', fontFamily: 'monospace', color: '#243038', letterSpacing: 1,
      }).setOrigin(0.5);
    };

    statCol(W * 0.22, `${gamesPlayed}`,        t().games);
    statCol(W * 0.50, `${Math.floor(totalTime)}s`, t().totalTime);
    statCol(W * 0.78, `${maxCombo}`,            t().bestCombo);
  }
}
