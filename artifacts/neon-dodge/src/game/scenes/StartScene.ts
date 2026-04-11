
/* =========================================================
   START SCENE — Awwwards-style minimal neon typography
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
  private floatingPlayerCX = 0;
  private floatingPlayerCY = 0;
  private playerTrail: Phaser.GameObjects.Arc[] = [];
  private playerTrailTimer = 0;
  private skinDots: Phaser.GameObjects.Arc[] = [];
  private skinRings: Phaser.GameObjects.Arc[] = [];

  /* Title refs for glitch */
  private glitchTimer  = 0;
  private glitchActive = false;
  private titleNeon!: Phaser.GameObjects.Text;
  private titleDodge!: Phaser.GameObjects.Text;
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
    this._buildLangSelector();
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
     TITLE
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
     GLITCH
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
      this.add.text(W / 2, H * 0.41, `★  ${t().best}  ${hi}`, {
        fontSize: '15px', fontFamily: 'monospace', color: '#33aacc',
        stroke: '#006688', strokeThickness: 1,
      }).setOrigin(0.5);
    } else {
      this.add.text(W / 2, H * 0.41, t().noRecord, {
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
    this.floatingPlayerCX = cx;
    this.floatingPlayerCY = cy;

    const glow = this.add.circle(cx, cy, 30, skin.color, 0.08);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.02 }, scaleX: 1.2, scaleY: 1.2,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.floatingPlayerImg = this.add.image(0, 0, 'player-rocket')
      .setDisplaySize(48, 54)
      .setTint(skin.color);

    this.floatingPlayer = this.add.container(cx, cy, [this.floatingPlayerImg]);

    this.tweens.add({
      targets: [this.floatingPlayer, glow],
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
    const spacing = 56;
    const total = SKINS.length;
    const startX = W / 2 - ((total - 1) / 2) * spacing;

    /* Label — larger and much more visible */
    this.add.text(W / 2, cy - 34, t().selectSkin, {
      fontSize: '13px', fontFamily: 'monospace',
      color: '#aabbcc', letterSpacing: 3,
      stroke: '#003344', strokeThickness: 1,
    }).setOrigin(0.5);

    this.skinDots  = [];
    this.skinRings = [];

    for (let i = 0; i < total; i++) {
      const x = startX + i * spacing;
      const isSelected = i === this.selectedSkin;
      const col = SKINS[i].color;
      const hex = SKINS[i].hex;

      /* Outer glow ring */
      const ring = this.add.circle(x, cy, isSelected ? 18 : 14, 0x000000, 0)
        .setStrokeStyle(isSelected ? 2.5 : 1, col, isSelected ? 1 : 0.3);
      this.skinRings.push(ring);

      /* Colour dot — bigger, clickable */
      const dot = this.add.circle(x, cy, isSelected ? 13 : 9, col, isSelected ? 1 : 0.5)
        .setInteractive({ useHandCursor: true });
      this.skinDots.push(dot);

      /* Skin name label below dot */
      this.add.text(x, cy + 26, SKINS[i].name.toUpperCase(), {
        fontSize: '9px', fontFamily: 'monospace',
        color: isSelected ? hex : '#334455',
        stroke: isSelected ? hex : 'transparent',
        strokeThickness: 0.5,
      }).setOrigin(0.5).setName(`skinlabel_${i}`);

      dot.on('pointerover', () => { if (i !== this.selectedSkin) dot.setRadius(11).setAlpha(0.78); });
      dot.on('pointerout',  () => { if (i !== this.selectedSkin) dot.setRadius(9).setAlpha(0.50); });
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
      this.skinDots[i].setRadius(isSel ? 13 : 9).setAlpha(isSel ? 1 : 0.50);
      this.skinRings[i].setRadius(isSel ? 18 : 14)
        .setStrokeStyle(isSel ? 2.5 : 1, col, isSel ? 1 : 0.3);
    }
  }

  private _updateFloatingPlayerColor() {
    const col = SKINS[this.selectedSkin].color;
    this.floatingPlayerImg.setTint(col);
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
    const label = this.add.text(cx, cy, t().play, {
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
     LANGUAGE SELECTOR  (below PLAY button)
  -------------------------------------------------------- */
  private _buildLangSelector() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cy = H * 0.775;
    const lang = getLang();
    const FLAG_SIZE = 26;
    const gap = 20;

    /* TR flag */
    const flagTr = this.add.image(W / 2 - gap - FLAG_SIZE / 2, cy, 'flag-tr')
      .setDisplaySize(FLAG_SIZE, FLAG_SIZE)
      .setInteractive({ useHandCursor: true });

    /* EN flag */
    const flagEn = this.add.image(W / 2 + gap + FLAG_SIZE / 2, cy, 'flag-en')
      .setDisplaySize(FLAG_SIZE, FLAG_SIZE)
      .setInteractive({ useHandCursor: true });

    /* Active highlight ring */
    const activeTr = this.add.circle(flagTr.x, cy, FLAG_SIZE / 2 + 3, 0x000000, 0)
      .setStrokeStyle(lang === 'tr' ? 2 : 0, 0x00ffff, 0.85);
    const activeEn = this.add.circle(flagEn.x, cy, FLAG_SIZE / 2 + 3, 0x000000, 0)
      .setStrokeStyle(lang === 'en' ? 2 : 0, 0x00ffff, 0.85);

    /* Dim inactive flag */
    flagTr.setAlpha(lang === 'tr' ? 1 : 0.38);
    flagEn.setAlpha(lang === 'en' ? 1 : 0.38);

    const _switch = (newLang: 'tr' | 'en') => {
      if (getLang() === newLang) return;
      setLang(newLang);
      this.scene.restart();
    };

    flagTr.on('pointerdown', () => _switch('tr'));
    flagEn.on('pointerdown', () => _switch('en'));

    flagTr.on('pointerover', () => { if (lang !== 'tr') flagTr.setAlpha(0.7); });
    flagTr.on('pointerout',  () => { if (lang !== 'tr') flagTr.setAlpha(0.38); });
    flagEn.on('pointerover', () => { if (lang !== 'en') flagEn.setAlpha(0.7); });
    flagEn.on('pointerout',  () => { if (lang !== 'en') flagEn.setAlpha(0.38); });

    /* Suppress game-start on flag click */
    void activeTr; void activeEn;
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
    const cy = H * 0.865;

    const dg = this.add.graphics();
    dg.lineStyle(1, 0x00ffff, 0.07);
    dg.lineBetween(W * 0.12, cy - 20, W * 0.88, cy - 20);

    const col = (x: number, value: string, lbl: string) => {
      this.add.text(x, cy - 8, value, {
        fontSize: '14px', fontFamily: 'monospace', color: '#6699aa',
        stroke: '#003344', strokeThickness: 1,
      }).setOrigin(0.5);
      this.add.text(x, cy + 10, lbl, {
        fontSize: '9px', fontFamily: 'monospace', color: '#3a5060', letterSpacing: 1,
      }).setOrigin(0.5);
    };

    col(W * 0.22, `${gamesPlayed}`, t().games);
    col(W * 0.50, `${Math.floor(totalTime)}s`, t().totalTime);
    col(W * 0.78, `${maxCombo}`, t().bestCombo);
  }
}
