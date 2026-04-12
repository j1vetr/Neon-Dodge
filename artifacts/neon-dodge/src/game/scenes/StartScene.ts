
/* =========================================================
   START SCENE — NEON DODGE  —  800×1400 HD resolution
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

/* Module-level fire particle type (StartScene trail) */
interface StartFireParticle {
  circle: Phaser.GameObjects.Arc;
  born: number;
  lifetime: number;
  vx: number;
  vy: number;
  startRadius: number;
  maxAlpha: number;
}

/* =========================================================
   SCENE CLASS
   ========================================================= */
export class StartScene extends Phaser.Scene {

  /* Player / skin */
  private selectedSkin = 0;
  private floatingPlayer!: Phaser.GameObjects.Container;
  private floatingPlayerImg!: Phaser.GameObjects.Image;
  private fireParticles: StartFireParticle[] = [];
  private fireTimer = 0;

  /* Title glitch */
  private glitchTimer  = 0;
  private glitchActive = false;
  private titleNeon!:  Phaser.GameObjects.Text;
  private titleDodge!: Phaser.GameObjects.Text;
  private glitchTexts: Phaser.GameObjects.Text[] = [];

  /* Card / color tiles */
  private skinGfx!:          Phaser.GameObjects.Graphics;
  private skinImgs:          Phaser.GameObjects.Image[] = [];
  private cardBorderGfx!:    Phaser.GameObjects.Graphics;
  private selectedColorTxt!: Phaser.GameObjects.Text;
  private readonly TILE = 64;
  private readonly TGAP = 104;
  private tileY  = 0;
  private tileX0 = 0;

  /* Settings panel */
  private settingsObjs: (Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown })[] = [];
  private settingsOpen  = false;

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
  update(time: number, delta: number) {
    /* ── Fire trail ─────────────────────────────────────── */
    this.fireTimer += delta;
    if (this.fireTimer > 35) {
      this.fireTimer = 0;
      /* rocket image is 104×120, nozzle at ~+50 from container center */
      const nx = this.floatingPlayer.x;
      const ny = this.floatingPlayer.y + 50;
      const tiers = [
        { col: 0xffffff, ba: 0.95, rMin: 2, rMax: 4,  vyMin: 55,  vyMax: 95,  vxR: 10, life: 190 },
        { col: 0xffee22, ba: 0.88, rMin: 4, rMax: 7,  vyMin: 85,  vyMax: 140, vxR: 22, life: 310 },
        { col: 0xff6600, ba: 0.72, rMin: 5, rMax: 9,  vyMin: 110, vyMax: 170, vxR: 34, life: 440 },
        { col: 0xcc1100, ba: 0.45, rMin: 6, rMax: 12, vyMin: 135, vyMax: 200, vxR: 46, life: 600 },
      ];
      for (const tier of tiers) {
        const r  = Phaser.Math.Between(tier.rMin, tier.rMax);
        const vy = Phaser.Math.Between(tier.vyMin, tier.vyMax);
        const vx = Phaser.Math.FloatBetween(-tier.vxR, tier.vxR);
        const dot = this.add.circle(nx + Phaser.Math.FloatBetween(-5, 5), ny, r, tier.col, tier.ba);
        dot.setDepth(5);
        this.fireParticles.push({ circle: dot, born: time, lifetime: tier.life, vx, vy, startRadius: r, maxAlpha: tier.ba });
      }
    }
    /* Update fire particles */
    const dt = delta / 1000;
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const p = this.fireParticles[i];
      const age = time - p.born;
      if (age >= p.lifetime) {
        p.circle.destroy();
        this.fireParticles.splice(i, 1);
      } else {
        const t = age / p.lifetime;
        p.circle.x += p.vx * dt;
        p.circle.y += p.vy * dt;
        const sf = t < 0.3 ? 1 + t * 0.9 : 1.27 - ((t - 0.3) / 0.7) * 1.27;
        p.circle.setRadius(Math.max(0.5, p.startRadius * Math.max(0, sf)));
        const fadeIn = Math.min(1, t / 0.08);
        p.circle.setAlpha(p.maxAlpha * fadeIn * (1 - t));
      }
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
      g.lineStyle(2, 0x00aaff, 0.06 + t2 * 0.18);
      g.lineBetween(0, y, W, y);
    }
    for (let i = 0; i <= 12; i++) {
      const bx = (i / 12) * W;
      g.lineStyle(2, 0x00aaff, 0.06 + 0.10 * Math.abs(i - 6) / 6);
      g.lineBetween(vX, vY, bx, H);
    }
    g.lineStyle(2, 0x001a33, 0.22);
    for (let x = 0; x <= W; x += 80) g.lineBetween(x, 0, x, vY);
    for (let y = 0; y <= vY; y += 80) g.lineBetween(0, y, W, y);
  }

  /* --------------------------------------------------------
     STARS
  -------------------------------------------------------- */
  private _drawStars() {
    const palette = [0xffffff, 0x00ffff, 0xff2060, 0xffcc00, 0x8844ff];
    for (let i = 0; i < 90; i++) {
      const x   = Phaser.Math.Between(0, GAME_WIDTH);
      const y   = Phaser.Math.Between(0, GAME_HEIGHT * 0.58);
      const r   = Math.random() * 2.8 + 0.6;
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
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      g.fillStyle(0x000000, 1);
      g.fillRect(0, y, GAME_WIDTH, 4);
    }
  }

  /* --------------------------------------------------------
     TITLE
  -------------------------------------------------------- */
  private _buildTitle() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2;
    const neonY  = H * 0.148;
    const dodgeY = H * 0.242;
    const tagY   = H * 0.324;

    const dg = this.add.graphics();
    dg.lineStyle(2, 0x00eeff, 0.38);
    dg.lineBetween(cx - 204, neonY - 48, cx - 16, neonY - 48);
    dg.lineBetween(cx +  16, neonY - 48, cx + 204, neonY - 48);
    _diamond(dg, cx, neonY - 48, 8, 0x00eeff, 0.7);
    dg.lineStyle(2, 0xff22aa, 0.35);
    dg.lineBetween(cx - 244, dodgeY + 104, cx - 16, dodgeY + 104);
    dg.lineBetween(cx +  16, dodgeY + 104, cx + 244, dodgeY + 104);
    _diamond(dg, cx, dodgeY + 104, 8, 0xff22aa, 0.6);

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
        shadow: { color: outlineColor, blur: 20, fill: false, stroke: true, offsetX: 0, offsetY: 0 },
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
    const nSp = 56, nSt = cx - ((NEON.length - 1) / 2) * nSp;
    const neonLetters = NEON.map((ch, i) =>
      spawnChar(ch, nSt + i * nSp, neonY, '#00eeff', 48, 3, 40 + i * 80));
    this.titleNeon = neonLetters[neonLetters.length - 1];

    const DODGE = ['D', 'O', 'D', 'G', 'E'];
    const dSp = 112, dSt = cx - ((DODGE.length - 1) / 2) * dSp;
    const dodgeLetters = DODGE.map((ch, i) =>
      spawnChar(ch, dSt + i * dSp, dodgeY, '#ff22aa', 132, 4, 280 + i * 75));
    this.titleDodge = dodgeLetters[dodgeLetters.length - 1];

    const tag = this.add.text(cx, tagY, 'S U R V I V E   T H E   N E O N', {
      fontSize: '16px', fontFamily: 'monospace', color: '#253340', letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);
    floatAll.push(tag);
    this.time.delayedCall(1100, () =>
      this.tweens.add({ targets: tag, alpha: 0.55, duration: 600 }));
    this.time.delayedCall(1300, () => {
      this.tweens.add({
        targets: floatAll, y: '-=14',
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
     GLITCH
  -------------------------------------------------------- */
  private _fireGlitch() {
    this.glitchActive = true;
    const W = GAME_WIDTH;
    const texts  = ['NEON', 'DODGE'];
    const yPos   = [GAME_HEIGHT * 0.167, GAME_HEIGHT * 0.232];
    const sizes  = ['44px', '144px'];
    const tints  = ['#ff0044', '#00ffff', '#ffee00'];

    for (const tint of tints) {
      for (let l = 0; l < 2; l++) {
        const ox = Phaser.Math.Between(-16, 16);
        const oy = Phaser.Math.Between(-6, 6);
        const gt = this.add.text(W / 2 + ox, yPos[l] + oy, texts[l], {
          fontSize: sizes[l],
          fontFamily: '"Arial Black", "Arial Bold", sans-serif',
          fontStyle: 'bold', color: tint,
        }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25);
        this.glitchTexts.push(gt);
      }
    }
    const shift = Phaser.Math.Between(-10, 10);
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
     BEST SCORE
  -------------------------------------------------------- */
  private _buildBestScore() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const hi = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    const y   = H * 0.381;

    const g = this.add.graphics();
    g.lineStyle(2, 0x00ffff, 0.09);
    g.lineBetween(W * 0.08, y - 26, W * 0.92, y - 26);

    if (hi > 0) {
      this.add.text(W / 2, y, `★  ${t().best.toUpperCase()}  ${hi}`, {
        fontSize: '28px',
        fontFamily: '"Orbitron", monospace',
        fontStyle: 'bold',
        color: '#050510',
        stroke: '#00ddcc',
        strokeThickness: 2.4,
        shadow: { color: '#00ffcc', blur: 16, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
      }).setOrigin(0.5);
    } else {
      this.add.text(W / 2, y, t().noRecord, {
        fontSize: '20px', fontFamily: 'monospace', color: '#182530', letterSpacing: 2,
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
    const CARD_W   = W - 72;
    const CARD_H   = 448;
    const R        = 28;

    /* ── Background ── */
    const cbg = this.add.graphics();
    cbg.fillStyle(0x070718, 0.88);
    cbg.fillRoundedRect(CX - CARD_W / 2, CARD_TOP, CARD_W, CARD_H, R);

    /* ── Border (skin-tinted, redrawn on change) ── */
    this.cardBorderGfx = this.add.graphics();
    this._drawCardBorder();

    /* ── Subtle inner top line ── */
    const tl = this.add.graphics();
    tl.lineStyle(2, 0x00ffff, 0.14);
    tl.lineBetween(CX - CARD_W / 2 + R, CARD_TOP + 2, CX + CARD_W / 2 - R, CARD_TOP + 2);

    /* ── Rocket preview ── */
    const rocketY = CARD_TOP + 116;
    const skin = SKINS[this.selectedSkin];

    const rGlow = this.add.circle(CX, rocketY, 68, skin.color, 0.07);
    this.tweens.add({
      targets: rGlow, alpha: { from: 0.07, to: 0.02 }, scaleX: 1.35, scaleY: 1.35,
      duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.floatingPlayerImg = this.add.image(0, 0, SKINS[this.selectedSkin].key)
      .setDisplaySize(104, 120);
    this.floatingPlayer = this.add.container(CX, rocketY, [this.floatingPlayerImg]);
    this.tweens.add({
      targets: [this.floatingPlayer, rGlow], y: '-=22',
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    /* ── Big color name — changes on selection ── */
    this.selectedColorTxt = this.add.text(CX, CARD_TOP + 228, t().skinNames[this.selectedSkin], {
      fontSize: '44px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: skin.hex,
    }).setOrigin(0.5);

    /* ── Thin rule + "RENK SEÇ" label ── */
    const ruleY = CARD_TOP + 282;
    const rule = this.add.graphics();
    rule.lineStyle(2, 0x00ffff, 0.1);
    rule.lineBetween(CX - 212, ruleY, CX + 212, ruleY);

    this.add.text(CX, ruleY + 28, t().selectSkin, {
      fontSize: '18px', fontFamily: 'monospace', color: '#243038', letterSpacing: 4,
    }).setOrigin(0.5);

    /* ── Color tiles ── */
    const TILE  = this.TILE, TGAP = this.TGAP;
    const tileY = CARD_TOP + 376;
    const tileX0 = CX - ((SKINS.length - 1) / 2) * TGAP;
    this.tileY  = tileY;
    this.tileX0 = tileX0;

    this.skinGfx = this.add.graphics();
    this.skinImgs = [];

    for (let i = 0; i < SKINS.length; i++) {
      const x = tileX0 + i * TGAP;

      const img = this.add.image(x, tileY, SKINS[i].key)
        .setDisplaySize(TILE, TILE)
        .setAlpha(i === this.selectedSkin ? 1 : 0.35);
      this.skinImgs.push(img);

      const hit = this.add.rectangle(x, tileY, TILE + 24, TILE + 24, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (i !== this.selectedSkin) img.setAlpha(0.65); });
      hit.on('pointerout',  () => { if (i !== this.selectedSkin) img.setAlpha(0.38); });
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
    const CARD_W   = W - 72;
    const CARD_H   = 448;
    const col = SKINS[this.selectedSkin].color;
    const g = this.cardBorderGfx;
    g.clear();
    g.lineStyle(3, col, 0.38);
    g.strokeRoundedRect(W / 2 - CARD_W / 2, CARD_TOP, CARD_W, CARD_H, 28);
  }

  /* ── Skin tiles ── */
  private _drawTiles() {
    const g = this.skinGfx;
    g.clear();
    const S = this.TILE, sp = this.TGAP;
    const cy = this.tileY, sx = this.tileX0;
    const r  = 12;
    for (let i = 0; i < SKINS.length; i++) {
      const x   = sx + i * sp;
      const col = SKINS[i].color;
      const sel = i === this.selectedSkin;
      const h   = S / 2;
      if (sel) {
        g.lineStyle(4, 0xffffff, 0.7);
        g.strokeRoundedRect(x - h - 4, cy - h - 4, S + 8, S + 8, r + 2);
        g.lineStyle(2, col, 0.9);
        g.strokeRoundedRect(x - h - 8, cy - h - 8, S + 16, S + 16, r + 4);
      }
      this.skinImgs[i]?.setAlpha(sel ? 1 : 0.38);
    }
  }

  private _refreshSelector() {
    this._drawCardBorder();
    this._drawTiles();
    const skin = SKINS[this.selectedSkin];
    this.selectedColorTxt.setText(t().skinNames[this.selectedSkin]);
    this.selectedColorTxt.setColor(skin.hex);
  }

  private _updateRocket() {
    this.floatingPlayerImg.setTexture(SKINS[this.selectedSkin].key);
  }

  /* --------------------------------------------------------
     PLAY BUTTON — full-width, Orbitron, neon pulse
  -------------------------------------------------------- */
  private _buildPlayButton() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const CX = W / 2;
    const cy  = H * 0.787;
    const BW  = W - 72;
    const BH  = 116;

    /* Glow aura */
    const aura = this.add.graphics();
    aura.lineStyle(28, 0x00ffff, 0.05);
    aura.strokeRoundedRect(CX - BW/2 - 14, cy - BH/2 - 14, BW+28, BH+28, 28);
    aura.lineStyle(10, 0x00ffff, 0.1);
    aura.strokeRoundedRect(CX - BW/2 - 4, cy - BH/2 - 4, BW+8, BH+8, 24);

    /* Fill + border */
    const fill   = this.add.graphics();
    fill.fillStyle(0x00ffff, 0.07);
    fill.fillRoundedRect(CX - BW/2, cy - BH/2, BW, BH, 20);

    const border = this.add.graphics();
    border.lineStyle(4, 0x00ffff, 1);
    border.strokeRoundedRect(CX - BW/2, cy - BH/2, BW, BH, 20);

    /* Label */
    const label = this.add.text(CX, cy, t().play, {
      fontSize: '44px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: '#050510',
      stroke: '#00ffff',
      strokeThickness: 3,
      shadow: { color: '#00ffff', blur: 20, stroke: true, fill: false, offsetX: 0, offsetY: 0 },
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
     SETTINGS GEAR BUTTON
  -------------------------------------------------------- */
  private _buildSettingsBtn() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H * 0.901;
    const SIZE = 76;

    /* PNG icon — tinted cyan, constant slow rotation */
    const icon = this.add.image(cx, cy, 'icon-settings')
      .setDisplaySize(SIZE, SIZE)
      .setTint(0x00ffff)
      .setAlpha(0.55);

    /* Continuous spin */
    this.tweens.add({
      targets: icon,
      angle: 360,
      duration: 5000,
      repeat: -1,
      ease: 'Linear',
    });

    /* Hover: brighten */
    const hit = this.add.circle(cx, cy, SIZE / 2 + 12, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => icon.setAlpha(1).setTint(0x00ffff));
    hit.on('pointerout',  () => icon.setAlpha(0.55).setTint(0x00ffff));
    hit.on('pointerdown', () => this._toggleSettings());
  }

  /* --------------------------------------------------------
     SETTINGS PANEL  — overlay modal
  -------------------------------------------------------- */
  private _buildSettingsPanel() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const CX = W / 2;
    const py  = H * 0.494;
    const PW  = 568, PH = 584;
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
    pbg.fillRoundedRect(CX - PW/2, py - PH/2, PW, PH, 28);
    pbg.lineStyle(3, 0x00ffff, 0.45);
    pbg.strokeRoundedRect(CX - PW/2, py - PH/2, PW, PH, 28);
    /* Inner top accent */
    pbg.lineStyle(2, 0x00ffff, 0.18);
    pbg.lineBetween(CX - PW/2 + 28, py - PH/2 + 2, CX + PW/2 - 28, py - PH/2 + 2);
    push(pbg);

    /* ── Title ── */
    push(this.add.text(CX, py - PH/2 + 56, t().settings, {
      fontSize: '32px', fontFamily: '"Orbitron", monospace', fontStyle: 'bold',
      color: '#050510', stroke: '#00ffff', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D));

    /* ── Rule 1 ── */
    const rule1 = this.add.graphics().setDepth(D);
    rule1.lineStyle(2, 0x00ffff, 0.14);
    rule1.lineBetween(CX - PW/2 + 36, py - PH/2 + 104, CX + PW/2 - 36, py - PH/2 + 104);
    push(rule1);

    /* ── Language section ── */
    push(this.add.text(CX, py - PH/2 + 144, t().language, {
      fontSize: '18px', fontFamily: 'monospace', color: '#2d4455', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(D));

    const lang  = getLang();
    const FS    = 72;
    const trX   = CX - FS / 2 - 28, enX = CX + FS / 2 + 28;
    const flagY = py - PH/2 + 216;

    const ringTr = push(this.add.circle(trX, flagY, FS/2 + 10, 0x000000, 0)
      .setStrokeStyle(lang === 'tr' ? 4 : 0, 0x00ffff, 1).setDepth(D));
    const ringEn = push(this.add.circle(enX, flagY, FS/2 + 10, 0x000000, 0)
      .setStrokeStyle(lang === 'en' ? 4 : 0, 0x00ffff, 1).setDepth(D));

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
    rule2.lineStyle(2, 0x00ffff, 0.1);
    rule2.lineBetween(CX - PW/2 + 36, py - PH/2 + 300, CX + PW/2 - 36, py - PH/2 + 300);
    push(rule2);

    /* ── Sound section ── */
    push(this.add.text(CX, py - PH/2 + 336, t().sound, {
      fontSize: '18px', fontFamily: 'monospace', color: '#2d4455', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(D));

    const soundOn  = localStorage.getItem(STORAGE_SOUND) !== 'off';
    const ICO      = 72;
    const onX      = CX - ICO / 2 - 44;
    const offX     = CX + ICO / 2 + 44;
    const soundY   = py - PH/2 + 412;

    const ringOn  = push(this.add.circle(onX, soundY, ICO / 2 + 8, 0x000000, 0)
      .setStrokeStyle(soundOn ? 4 : 0, 0x00ffcc, 1).setDepth(D));
    const ringOff = push(this.add.circle(offX, soundY, ICO / 2 + 8, 0x000000, 0)
      .setStrokeStyle(!soundOn ? 4 : 0, 0xff4477, 1).setDepth(D));

    const iconOn = push(this.add.image(onX, soundY, 'icon-sound-on')
      .setDisplaySize(ICO, ICO)
      .setTint(soundOn ? 0x00ffcc : 0x334455)
      .setAlpha(soundOn ? 1 : 0.28)
      .setInteractive({ useHandCursor: true }).setDepth(D));

    const iconOff = push(this.add.image(offX, soundY, 'icon-sound-off')
      .setDisplaySize(ICO, ICO)
      .setTint(!soundOn ? 0xff4477 : 0x334455)
      .setAlpha(!soundOn ? 1 : 0.28)
      .setInteractive({ useHandCursor: true }).setDepth(D));

    const applySound = (on: boolean) => {
      setSoundEnabled(on);
      iconOn .setTint(on  ? 0x00ffcc : 0x334455).setAlpha(on  ? 1 : 0.28);
      iconOff.setTint(!on ? 0xff4477 : 0x334455).setAlpha(!on ? 1 : 0.28);
      (ringOn  as Phaser.GameObjects.Arc).setStrokeStyle(on  ? 4 : 0, 0x00ffcc, 1);
      (ringOff as Phaser.GameObjects.Arc).setStrokeStyle(!on ? 4 : 0, 0xff4477, 1);
    };

    iconOn .on('pointerdown', () => applySound(true));
    iconOff.on('pointerdown', () => applySound(false));

    /* ── Rule 3 ── */
    const rule3 = this.add.graphics().setDepth(D);
    rule3.lineStyle(2, 0x00ffff, 0.1);
    rule3.lineBetween(CX - PW/2 + 36, py - PH/2 + 476, CX + PW/2 - 36, py - PH/2 + 476);
    push(rule3);

    /* ── Close button ── */
    const closeBg = push(this.add.graphics().setDepth(D));
    const closeY  = py - PH/2 + 520;
    const drawClose = (hover: boolean) => {
      closeBg.clear();
      closeBg.lineStyle(3, 0xff4477, hover ? 1 : 0.7);
      closeBg.strokeRoundedRect(CX - 120, closeY - 30, 240, 60, 14);
      if (hover) { closeBg.fillStyle(0xff4477, 0.12); closeBg.fillRoundedRect(CX - 120, closeY - 30, 240, 60, 14); }
    };
    drawClose(false);

    push(this.add.text(CX, closeY, t().close, {
      fontSize: '24px', fontFamily: 'monospace', color: '#ff4477',
    }).setOrigin(0.5).setDepth(D));

    const closeHit = push(this.add.rectangle(CX, closeY, 260, 72, 0xffffff, 0)
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
