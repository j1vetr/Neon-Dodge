
/* =========================================================
   START SCENE — NEON DODGE
   Title typography preserved. Lower section fully redesigned:
   rocket-card + skin picker + big play + settings gear panel.
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLOR_BG, SKINS,
  STORAGE_HIGHSCORE, STORAGE_SKIN, STORAGE_SOUND,
} from '../constants';
import { getLang, setLang, t } from '../i18n';
import { setSoundEnabled } from '../audio';

/* ── Module-level helper ────────────────────────────────── */
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

  /* Player / skin */
  private selectedSkin = 0;
  private floatingPlayer!: Phaser.GameObjects.Container;
  private floatingPlayerImg!: Phaser.GameObjects.Image;
  private playerTrail: Phaser.GameObjects.Arc[] = [];
  private playerTrailTimer = 0;

  /* Title glitch */
  private glitchTimer  = 0;
  private glitchActive = false;
  private titleNeon!:  Phaser.GameObjects.Text;
  private titleDodge!: Phaser.GameObjects.Text;
  private glitchTexts: Phaser.GameObjects.Text[] = [];

  /* Card / color tiles */
  private skinGfx!:         Phaser.GameObjects.Graphics;
  private cardBorderGfx!:   Phaser.GameObjects.Graphics;
  private skinNameLabels:   Phaser.GameObjects.Text[] = [];
  private selectedColorTxt!: Phaser.GameObjects.Text;
  private readonly TILE = 32;
  private readonly TGAP = 52;
  private tileY  = 0;
  private tileX0 = 0;

  /* Settings panel */
  private settingsObjs: (Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown })[] = [];
  private settingsOpen  = false;
  private soundLabelTxt!: Phaser.GameObjects.Text;

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
    this._buildSettingsBtn();
    this._buildSettingsPanel();
  }

  /* --------------------------------------------------------
     UPDATE
  -------------------------------------------------------- */
  update(_time: number, delta: number) {
    this.playerTrailTimer += delta;
    if (this.playerTrailTimer > 55) {
      this.playerTrailTimer = 0;
      const skin = SKINS[this.selectedSkin];
      const cols = [skin.color, 0xffffff, 0xff8800, 0xffff00];
      const c    = cols[Math.floor(Math.random() * cols.length)];
      const dot  = this.add.circle(
        this.floatingPlayer.x + Phaser.Math.Between(-4, 4),
        this.floatingPlayer.y + 27 + Phaser.Math.Between(0, 5),
        Phaser.Math.Between(2, 4), c, 0.7,
      );
      this.playerTrail.push(dot);
      if (this.playerTrail.length > 10) this.playerTrail.shift()?.destroy();
      this.playerTrail.forEach((d, i) => d.setAlpha((i / this.playerTrail.length) * 0.38));
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
      const y  = vY + (H - vY) * t2;
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
      const x   = Phaser.Math.Between(0, GAME_WIDTH);
      const y   = Phaser.Math.Between(0, GAME_HEIGHT * 0.58);
      const r   = Math.random() * 1.4 + 0.3;
      const col = palette[Math.floor(Math.random() * palette.length)];
      const a   = Math.random() * 0.55 + 0.08;
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
     TITLE  ← preserved exactly
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
      outlineColor: string, mainPx: number, strokeW: number, startDelay: number,
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
                targets: lc, alpha: { from: 1.0, to: 0.55 }, duration: 90, yoyo: true,
                onComplete: () => {
                  this.tweens.add({
                    targets: lc, alpha: { from: 1.0, to: 0.78 },
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
        targets: floatAll, y: '-=7',
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
     GLITCH  ← preserved exactly
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
          fontStyle: 'bold', color: tint,
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
     BEST SCORE  — elegant neon line
  -------------------------------------------------------- */
  private _buildBestScore() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const hi = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    const y   = H * 0.381;

    const g = this.add.graphics();
    g.lineStyle(1, 0x00ffff, 0.09);
    g.lineBetween(W * 0.08, y - 13, W * 0.92, y - 13);

    if (hi > 0) {
      this.add.text(W / 2, y, `★  ${t().best.toUpperCase()}  ${hi}`, {
        fontSize: '14px',
        fontFamily: '"Orbitron", monospace',
        fontStyle: 'bold',
        color: '#050510',
        stroke: '#00ddcc',
        strokeThickness: 1.2,
        shadow: { color: '#00ffcc', blur: 8, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
      }).setOrigin(0.5);
    } else {
      this.add.text(W / 2, y, t().noRecord, {
        fontSize: '10px', fontFamily: 'monospace', color: '#182530', letterSpacing: 2,
      }).setOrigin(0.5);
    }
  }

  /* --------------------------------------------------------
     MAIN CARD  — rocket + color name + tile selector
  -------------------------------------------------------- */
  private _buildMainCard() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const CX       = W / 2;
    const CARD_TOP = H * 0.406;
    const CARD_W   = W - 36;
    const CARD_H   = 224;
    const R        = 14;

    /* ── Background ── */
    const cbg = this.add.graphics();
    cbg.fillStyle(0x070718, 0.88);
    cbg.fillRoundedRect(CX - CARD_W / 2, CARD_TOP, CARD_W, CARD_H, R);

    /* ── Border (skin-tinted, redrawn on change) ── */
    this.cardBorderGfx = this.add.graphics();
    this._drawCardBorder();

    /* ── Subtle inner top line ── */
    const tl = this.add.graphics();
    tl.lineStyle(1, 0x00ffff, 0.14);
    tl.lineBetween(CX - CARD_W / 2 + R, CARD_TOP + 1, CX + CARD_W / 2 - R, CARD_TOP + 1);

    /* ── Rocket preview ── */
    const rocketY = CARD_TOP + 58;
    const skin = SKINS[this.selectedSkin];

    const rGlow = this.add.circle(CX, rocketY, 34, skin.color, 0.07);
    this.tweens.add({
      targets: rGlow, alpha: { from: 0.07, to: 0.02 }, scaleX: 1.35, scaleY: 1.35,
      duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.floatingPlayerImg = this.add.image(0, 0, 'player-rocket')
      .setDisplaySize(52, 60).setTint(skin.color);
    this.floatingPlayer = this.add.container(CX, rocketY, [this.floatingPlayerImg]);
    this.tweens.add({
      targets: [this.floatingPlayer, rGlow], y: '-=11',
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* ── Big color name — changes on selection ── */
    this.selectedColorTxt = this.add.text(CX, CARD_TOP + 114, t().skinNames[this.selectedSkin], {
      fontSize: '22px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: skin.hex,
      stroke: skin.hex,
      strokeThickness: 0.8,
      shadow: { color: skin.hex, blur: 16, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);

    /* ── Thin rule + "RENK SEÇ" label ── */
    const ruleY = CARD_TOP + 141;
    const rule = this.add.graphics();
    rule.lineStyle(1, 0x00ffff, 0.1);
    rule.lineBetween(CX - 106, ruleY, CX + 106, ruleY);

    this.add.text(CX, ruleY + 14, t().selectSkin, {
      fontSize: '9px', fontFamily: 'monospace', color: '#243038', letterSpacing: 4,
    }).setOrigin(0.5);

    /* ── Color tiles ── */
    const TILE  = this.TILE, TGAP = this.TGAP;
    const tileY = CARD_TOP + 188;
    const tileX0 = CX - ((SKINS.length - 1) / 2) * TGAP;
    this.tileY  = tileY;
    this.tileX0 = tileX0;

    this.skinGfx = this.add.graphics();
    this.skinNameLabels = [];

    for (let i = 0; i < SKINS.length; i++) {
      const x   = tileX0 + i * TGAP;
      const isSel = i === this.selectedSkin;

      const lbl = this.add.text(x, tileY + TILE / 2 + 12, t().skinNames[i], {
        fontSize: '8px', fontFamily: 'monospace',
        color: isSel ? SKINS[i].hex : '#1c2d3a',
      }).setOrigin(0.5);
      this.skinNameLabels.push(lbl);

      const hit = this.add.rectangle(x, tileY + 8, TILE + 14, TILE + 30, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (i !== this.selectedSkin) hit.setFillStyle(0xffffff, 0.04); });
      hit.on('pointerout',  () => hit.setFillStyle(0xffffff, 0));
      hit.on('pointerdown', () => {
        this.selectedSkin = i;
        this._refreshSelector();
        this._updateRocket();
      });
    }

    this._drawTiles();

    void cbg; void tl; void rule;
  }

  /* ── Card border (skin colour) ── */
  private _drawCardBorder() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const CARD_TOP = H * 0.406;
    const CARD_W   = W - 36;
    const CARD_H   = 224;
    const col = SKINS[this.selectedSkin].color;
    const g = this.cardBorderGfx;
    g.clear();
    g.lineStyle(1.5, col, 0.38);
    g.strokeRoundedRect(W / 2 - CARD_W / 2, CARD_TOP, CARD_W, CARD_H, 14);
  }

  /* ── Color tiles ── */
  private _drawTiles() {
    const g = this.skinGfx;
    g.clear();
    const S = this.TILE, sp = this.TGAP;
    const cy = this.tileY, sx = this.tileX0;
    const r  = 6;
    for (let i = 0; i < SKINS.length; i++) {
      const x   = sx + i * sp;
      const col = SKINS[i].color;
      const sel = i === this.selectedSkin;
      const h   = S / 2;
      if (sel) {
        g.lineStyle(10, col, 0.05); g.strokeRoundedRect(x-h-8, cy-h-8, S+16, S+16, r+5);
        g.lineStyle(5,  col, 0.13); g.strokeRoundedRect(x-h-4, cy-h-4, S+8,  S+8,  r+3);
        g.lineStyle(2,  col, 0.45); g.strokeRoundedRect(x-h-1, cy-h-1, S+2,  S+2,  r+1);
        g.fillStyle(col, 1);        g.fillRoundedRect(x-h, cy-h, S, S, r);
        g.lineStyle(1.5, 0xffffff, 0.4); g.strokeRoundedRect(x-h+2, cy-h+2, S-4, S-4, r-2);
      } else {
        g.fillStyle(col, 0.15);  g.fillRoundedRect(x-h, cy-h, S, S, r);
        g.lineStyle(1, col, 0.28); g.strokeRoundedRect(x-h, cy-h, S, S, r);
      }
    }
  }

  private _refreshSelector() {
    this._drawCardBorder();
    this._drawTiles();
    const skin = SKINS[this.selectedSkin];
    this.selectedColorTxt.setText(t().skinNames[this.selectedSkin]);
    this.selectedColorTxt.setColor(skin.hex).setStroke(skin.hex, 0.8);
    for (let i = 0; i < SKINS.length; i++) {
      this.skinNameLabels[i].setColor(i === this.selectedSkin ? SKINS[i].hex : '#1c2d3a');
    }
  }

  private _updateRocket() {
    const col = SKINS[this.selectedSkin].color;
    this.floatingPlayerImg.setTint(col);
    this.playerTrail.forEach(d => d.setFillStyle(col));
  }

  /* --------------------------------------------------------
     PLAY BUTTON — full-width, Orbitron, neon pulse
  -------------------------------------------------------- */
  private _buildPlayButton() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const CX = W / 2;
    const cy  = H * 0.787;
    const BW  = W - 36;
    const BH  = 58;

    /* Glow aura */
    const aura = this.add.graphics();
    aura.lineStyle(14, 0x00ffff, 0.05);
    aura.strokeRoundedRect(CX - BW/2 - 7, cy - BH/2 - 7, BW+14, BH+14, 14);
    aura.lineStyle(5, 0x00ffff, 0.1);
    aura.strokeRoundedRect(CX - BW/2 - 2, cy - BH/2 - 2, BW+4, BH+4, 12);

    /* Fill + border */
    const fill   = this.add.graphics();
    fill.fillStyle(0x00ffff, 0.07);
    fill.fillRoundedRect(CX - BW/2, cy - BH/2, BW, BH, 10);

    const border = this.add.graphics();
    border.lineStyle(2, 0x00ffff, 1);
    border.strokeRoundedRect(CX - BW/2, cy - BH/2, BW, BH, 10);

    /* Label */
    const label = this.add.text(CX, cy, t().play, {
      fontSize: '22px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: '#050510',
      stroke: '#00ffff',
      strokeThickness: 1.5,
      shadow: { color: '#00ffff', blur: 10, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);

    /* Hit area */
    const btn = this.add.rectangle(CX, cy, BW, BH, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    /* Pulse */
    this.tweens.add({
      targets: [fill, border], alpha: { from: 1, to: 0.4 },
      duration: 980, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: label, alpha: { from: 1, to: 0.52 },
      duration: 980, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 110,
    });

    const _start = () => {
      localStorage.setItem(STORAGE_SKIN, String(this.selectedSkin));
      this.tweens.add({
        targets: [border, fill, label], scaleX: 1.04, scaleY: 1.04, alpha: 1,
        duration: 70, yoyo: true,
        onComplete: () => this.scene.start('GameScene', { skin: this.selectedSkin }),
      });
    };

    btn.on('pointerdown', _start);
    label.setInteractive({ useHandCursor: true }).on('pointerdown', _start);

    void aura;
  }

  /* --------------------------------------------------------
     SETTINGS GEAR BUTTON  — bottom centre, very subtle
  -------------------------------------------------------- */
  private _buildSettingsBtn() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H * 0.901;

    /* Small gear drawn with graphics */
    const g = this.add.graphics();
    g.fillStyle(0x1a2e3a, 1);
    g.fillCircle(cx, cy, 18);
    g.lineStyle(1, 0x00ffff, 0.3);
    g.strokeCircle(cx, cy, 18);

    /* Gear teeth — 8 small tick lines around the circle */
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r0 = 14, r1 = 18;
      g.lineStyle(2.5, 0x00ffff, 0.35);
      g.lineBetween(
        cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0,
        cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1,
      );
    }
    /* Inner circle */
    g.fillStyle(0x00ffff, 0.18);
    g.fillCircle(cx, cy, 7);

    /* Hit area */
    const hit = this.add.circle(cx, cy, 22, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => g.setAlpha(1.4));
    hit.on('pointerout',  () => g.setAlpha(1));
    hit.on('pointerdown', () => this._toggleSettings());

    /* Gentle pulse */
    this.tweens.add({
      targets: g, alpha: { from: 0.7, to: 1 },
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  /* --------------------------------------------------------
     SETTINGS PANEL  — overlay modal, hidden by default
  -------------------------------------------------------- */
  private _buildSettingsPanel() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const CX = W / 2;
    const py  = H * 0.494;
    const PW  = 284, PH = 254;
    const D   = 90;

    const push = <T extends Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown }>(o: T) => {
      this.settingsObjs.push(o);
      o.setVisible(false);
      return o;
    };

    /* ── Backdrop ── */
    const overlay = push(
      this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.82).setDepth(D - 1).setInteractive(),
    );
    overlay.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (Math.abs(ptr.x - CX) > PW / 2 || Math.abs(ptr.y - py) > PH / 2) {
        this._toggleSettings();
      }
    });

    /* ── Panel background ── */
    const pbg = this.add.graphics().setDepth(D);
    pbg.fillStyle(0x07091e, 0.97);
    pbg.fillRoundedRect(CX - PW/2, py - PH/2, PW, PH, 14);
    pbg.lineStyle(1.5, 0x00ffff, 0.45);
    pbg.strokeRoundedRect(CX - PW/2, py - PH/2, PW, PH, 14);
    /* Inner top accent */
    pbg.lineStyle(1, 0x00ffff, 0.18);
    pbg.lineBetween(CX - PW/2 + 14, py - PH/2 + 1, CX + PW/2 - 14, py - PH/2 + 1);
    push(pbg);

    /* ── Title ── */
    push(this.add.text(CX, py - PH/2 + 28, t().settings, {
      fontSize: '16px', fontFamily: '"Orbitron", monospace', fontStyle: 'bold',
      color: '#050510', stroke: '#00ffff', strokeThickness: 1.5,
    }).setOrigin(0.5).setDepth(D));

    /* ── Rule 1 ── */
    const rule1 = this.add.graphics().setDepth(D);
    rule1.lineStyle(1, 0x00ffff, 0.14);
    rule1.lineBetween(CX - PW/2 + 18, py - PH/2 + 52, CX + PW/2 - 18, py - PH/2 + 52);
    push(rule1);

    /* ── Language section ── */
    push(this.add.text(CX, py - PH/2 + 72, t().language, {
      fontSize: '9px', fontFamily: 'monospace', color: '#2d4455', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(D));

    const lang  = getLang();
    const FS    = 36;
    const trX   = CX - FS / 2 - 14, enX = CX + FS / 2 + 14;
    const flagY = py - PH/2 + 108;

    const ringTr = push(this.add.circle(trX, flagY, FS/2 + 5, 0x000000, 0)
      .setStrokeStyle(lang === 'tr' ? 2 : 0, 0x00ffff, 1).setDepth(D));
    const ringEn = push(this.add.circle(enX, flagY, FS/2 + 5, 0x000000, 0)
      .setStrokeStyle(lang === 'en' ? 2 : 0, 0x00ffff, 1).setDepth(D));

    const flagTr = push(this.add.image(trX, flagY, 'flag-tr')
      .setDisplaySize(FS, FS).setAlpha(lang === 'tr' ? 1 : 0.4)
      .setInteractive({ useHandCursor: true }).setDepth(D));
    const flagEn = push(this.add.image(enX, flagY, 'flag-en')
      .setDisplaySize(FS, FS).setAlpha(lang === 'en' ? 1 : 0.4)
      .setInteractive({ useHandCursor: true }).setDepth(D));

    const bsTr = flagTr.scaleX, bsEn = flagEn.scaleX;
    flagTr.on('pointerover', () => { if (getLang() !== 'tr') flagTr.setScale(bsTr * 1.1); });
    flagTr.on('pointerout',  () => { if (getLang() !== 'tr') flagTr.setScale(bsTr); });
    flagEn.on('pointerover', () => { if (getLang() !== 'en') flagEn.setScale(bsEn * 1.1); });
    flagEn.on('pointerout',  () => { if (getLang() !== 'en') flagEn.setScale(bsEn); });
    flagTr.on('pointerdown', () => { setLang('tr'); this.scene.restart(); });
    flagEn.on('pointerdown', () => { setLang('en'); this.scene.restart(); });

    void ringTr; void ringEn;

    /* ── Rule 2 ── */
    const rule2 = this.add.graphics().setDepth(D);
    rule2.lineStyle(1, 0x00ffff, 0.1);
    rule2.lineBetween(CX - PW/2 + 18, py - PH/2 + 150, CX + PW/2 - 18, py - PH/2 + 150);
    push(rule2);

    /* ── Sound section ── */
    push(this.add.text(CX, py - PH/2 + 170, t().sound, {
      fontSize: '9px', fontFamily: 'monospace', color: '#2d4455', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(D));

    const soundOn = localStorage.getItem(STORAGE_SOUND) !== 'off';
    const soundBg = push(this.add.graphics().setDepth(D));
    const soundBtnY = py - PH/2 + 202;
    const drawSoundBtn = (on: boolean) => {
      soundBg.clear();
      const col = on ? 0x00ffcc : 0x334455;
      soundBg.lineStyle(1.5, col, 1);
      soundBg.strokeRoundedRect(CX - 66, soundBtnY - 17, 132, 34, 8);
      soundBg.fillStyle(col, 0.08);
      soundBg.fillRoundedRect(CX - 66, soundBtnY - 17, 132, 34, 8);
    };
    drawSoundBtn(soundOn);

    this.soundLabelTxt = push(this.add.text(CX, soundBtnY, soundOn ? t().soundOn : t().soundOff, {
      fontSize: '13px', fontFamily: 'monospace',
      color: soundOn ? '#00ffcc' : '#445566',
    }).setOrigin(0.5).setDepth(D)) as Phaser.GameObjects.Text &
      { setVisible(v: boolean): unknown };

    const soundHit = push(this.add.rectangle(CX, soundBtnY, 140, 40, 0xffffff, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D));
    soundHit.on('pointerdown', () => {
      const next = localStorage.getItem(STORAGE_SOUND) === 'off';
      setSoundEnabled(next);
      drawSoundBtn(next);
      this.soundLabelTxt.setText(next ? t().soundOn : t().soundOff);
      this.soundLabelTxt.setColor(next ? '#00ffcc' : '#445566');
    });

    /* ── Rule 3 ── */
    const rule3 = this.add.graphics().setDepth(D);
    rule3.lineStyle(1, 0x00ffff, 0.1);
    rule3.lineBetween(CX - PW/2 + 18, py - PH/2 + 228, CX + PW/2 - 18, py - PH/2 + 228);
    push(rule3);

    /* ── Close button ── */
    const closeBg = push(this.add.graphics().setDepth(D));
    const closeY  = py - PH/2 + 245;
    const drawClose = (hover: boolean) => {
      closeBg.clear();
      closeBg.lineStyle(1.5, 0xff4477, hover ? 1 : 0.7);
      closeBg.strokeRoundedRect(CX - 60, closeY - 15, 120, 30, 7);
      if (hover) { closeBg.fillStyle(0xff4477, 0.12); closeBg.fillRoundedRect(CX - 60, closeY - 15, 120, 30, 7); }
    };
    drawClose(false);

    push(this.add.text(CX, closeY, t().close, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff4477',
    }).setOrigin(0.5).setDepth(D));

    const closeHit = push(this.add.rectangle(CX, closeY, 130, 36, 0xffffff, 0)
      .setInteractive({ useHandCursor: true }).setDepth(D));
    closeHit.on('pointerover', () => drawClose(true));
    closeHit.on('pointerout',  () => drawClose(false));
    closeHit.on('pointerdown', () => this._toggleSettings());
  }

  private _toggleSettings() {
    this.settingsOpen = !this.settingsOpen;
    this.settingsObjs.forEach(o => o.setVisible(this.settingsOpen));
  }
}
