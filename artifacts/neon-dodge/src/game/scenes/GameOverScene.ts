
/* =========================================================
   GAME OVER SCENE  —  800×1400 HD resolution
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, SKINS,
  STORAGE_GAMES_PLAYED, STORAGE_TOTAL_TIME, STORAGE_MAX_COMBO,
  STORAGE_HIGHSCORE,
} from '../constants';
import { t } from '../i18n';

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private best = 0;
  private skinIndex = 0;
  private levelReached = 1;
  private maxCombo = 0;
  private elapsedTime = 0;
  private hasRevived = false;

  constructor() { super({ key: 'GameOverScene' }); }

  init(data: {
    score: number; best: number; skin: number;
    level?: number; maxCombo?: number; elapsedTime?: number;
    hasRevived?: boolean;
  }) {
    this.score        = data.score ?? 0;
    this.best         = data.best ?? 0;
    this.skinIndex    = data.skin ?? 0;
    this.levelReached = data.level ?? 1;
    this.maxCombo     = data.maxCombo ?? 0;
    this.elapsedTime  = data.elapsedTime ?? 0;
    this.hasRevived   = data.hasRevived ?? false;
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const skin = SKINS[this.skinIndex];

    /* ---- Background ---- */
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.92);
    this._drawGrid();

    /* ---- Top accent line ---- */
    this.add.rectangle(W / 2, 0, W, 6, 0xff2060, 1);

    /* ---- GAME OVER header ---- */
    this.add.text(W / 2, 104, t().gameOver, {
      fontSize: '68px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: '#050510',
      stroke: '#ff2060',
      strokeThickness: 4,
      shadow: { color: '#ff2060', blur: 24, fill: false, stroke: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);

    /* ---- Player rocket preview ---- */
    const glow = this.add.circle(W / 2, 212, 56, skin.color, 0.1);
    this.tweens.add({ targets: glow, alpha: 0.04, duration: 900, yoyo: true, repeat: -1 });

    const rocketImg = this.add.image(W / 2, 212, SKINS[this.skinIndex].key)
      .setDisplaySize(96, 108);
    this.tweens.add({ targets: [rocketImg, glow], y: '+=8', duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    /* ---- Divider ---- */
    this._divider(256);

    /* ---- Score block ---- */
    this.add.text(W / 2, 316, `${this.score}`, {
      fontSize: '112px',
      fontFamily: '"Orbitron", monospace',
      fontStyle: 'bold',
      color: '#050510',
      stroke: '#00ffff',
      strokeThickness: 4,
      shadow: { color: '#00ffff', blur: 24, fill: false, stroke: true, offsetX: 0, offsetY: 0 },
    }).setOrigin(0.5);
    this.add.text(W / 2, 392, t().score, {
      fontSize: '22px', fontFamily: 'monospace', color: '#334455', letterSpacing: 3,
    }).setOrigin(0.5);

    /* ---- New best badge ---- */
    const newBest = this.score > 0 && this.score >= this.best;
    if (newBest) {
      const nb = this.add.text(W / 2, 436, t().newBest, {
        fontSize: '28px', fontFamily: 'monospace', color: '#ffcc00',
        stroke: '#885500', strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, alpha: 0.25, duration: 550, yoyo: true, repeat: -1 });
    } else {
      this.add.text(W / 2, 436, `${t().best}  ${this.best}`, {
        fontSize: '26px', fontFamily: 'monospace', color: '#334455',
      }).setOrigin(0.5);
    }

    /* ---- Divider ---- */
    this._divider(480);

    /* ---- Stat row: level / time / combo ---- */
    this._statRow(H * 0.38);

    /* ---- Divider ---- */
    this._divider(H * 0.44);

    /* ---- Stats lifetime ---- */
    this._lifetimeStats(H * 0.50);

    /* ---- Divider ---- */
    this._divider(H * 0.57);

    /* ---- Buttons ---- */
    if (!this.hasRevived) {
      this._makeButton(W / 2, H * 0.645, t().watchAd, '#ffcc00', 420, 76,
        () => this._showAdPlaceholder());
    }

    const btnOffset = this.hasRevived ? -0.045 : 0;
    this._makeButton(W / 2, H * (0.735 + btnOffset), t().playAgain, '#00ffff', 360, 80,
      () => this.scene.start('GameScene', { skin: this.skinIndex }));

    this._makeButton(W / 2, H * (0.825 + btnOffset), t().menu, '#ff2060', 240, 68,
      () => this.scene.start('StartScene'));

    /* ---- Bottom accent ---- */
    this.add.rectangle(W / 2, H, W, 6, 0xff2060, 1);
  }

  /* -------- helpers -------- */

  private _divider(y: number) {
    const g = this.add.graphics();
    g.lineStyle(2, 0x112233, 0.7);
    g.lineBetween(48, y, GAME_WIDTH - 48, y);
  }

  private _statRow(cy: number) {
    const W = GAME_WIDTH;
    const col = (x: number, value: string, label: string, color: string) => {
      this.add.text(x, cy - 20, value, {
        fontSize: '36px', fontFamily: 'monospace', color,
        stroke: color, strokeThickness: 2,
      }).setOrigin(0.5);
      this.add.text(x, cy + 24, label, {
        fontSize: '20px', fontFamily: 'monospace', color: '#445566', letterSpacing: 2,
      }).setOrigin(0.5);
    };

    col(W * 0.22, `${t().lvl} ${this.levelReached}`, t().level, '#00ffcc');
    col(W * 0.50, `${this.elapsedTime}s`, t().survived, '#aaddff');
    col(W * 0.78, `${this.maxCombo}`, t().maxCombo, '#ffcc00');
  }

  private _lifetimeStats(cy: number) {
    const W = GAME_WIDTH;
    const gamesPlayed = parseInt(localStorage.getItem(STORAGE_GAMES_PLAYED) || '0', 10);
    const totalTime   = parseFloat(localStorage.getItem(STORAGE_TOTAL_TIME) || '0');
    const maxComboAll = parseInt(localStorage.getItem(STORAGE_MAX_COMBO) || '0', 10);

    this.add.text(W / 2, cy - 36, t().allTime, {
      fontSize: '20px', fontFamily: 'monospace', color: '#223344', letterSpacing: 4,
    }).setOrigin(0.5);

    const col = (x: number, value: string, label: string) => {
      this.add.text(x, cy, value, {
        fontSize: '28px', fontFamily: 'monospace', color: '#556677',
      }).setOrigin(0.5);
      this.add.text(x, cy + 36, label, {
        fontSize: '18px', fontFamily: 'monospace', color: '#2a3a4a', letterSpacing: 1,
      }).setOrigin(0.5);
    };

    col(W * 0.22, `${gamesPlayed}`, t().games);
    col(W * 0.50, `${Math.floor(totalTime)}s`, t().totalTime);
    col(W * 0.78, `${maxComboAll}`, t().bestCombo);
  }

  private _makeButton(x: number, y: number, label: string, color: string, w: number, h: number, cb: () => void) {
    const phColor = Phaser.Display.Color.HexStringToColor(color).color;

    const btn = this.add.rectangle(x, y, w, h, 0x000000, 0)
      .setStrokeStyle(4, phColor, 1)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(x, y, label, {
      fontSize: '26px', fontFamily: 'monospace', color,
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(phColor, 0.14));
    btn.on('pointerout',  () => btn.setFillStyle(0x000000, 0));
    btn.on('pointerdown', () => {
      this.tweens.add({ targets: [btn, txt], scaleX: 0.95, scaleY: 0.95, duration: 60, yoyo: true });
      this.time.delayedCall(100, cb);
    });
  }

  private _drawGrid() {
    const g = this.add.graphics();
    g.lineStyle(2, 0x001122, 0.18);
    for (let x = 0; x <= GAME_WIDTH; x += 80) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += 80) g.lineBetween(0, y, GAME_WIDTH, y);
  }

  private _showAdPlaceholder() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.94).setDepth(100);
    this.add.rectangle(W / 2, H / 2, W * 0.82, H * 0.38, 0x0a0a18, 1)
      .setStrokeStyle(4, 0xffcc00, 1).setDepth(101);

    this.add.text(W / 2, H * 0.38, t().adTitle, {
      fontSize: '30px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(W / 2, H * 0.46, t().adBody, {
      fontSize: '24px', fontFamily: 'monospace', color: '#667788', align: 'center',
    }).setOrigin(0.5).setDepth(102);

    let countdown = 5;
    const cTxt = this.add.text(W / 2, H * 0.55, `${t().closeIn} ${countdown}s`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#334455',
    }).setOrigin(0.5).setDepth(102);

    const timer = this.time.addEvent({
      delay: 1000, repeat: 4,
      callback: () => {
        countdown--;
        cTxt.setText(countdown > 0 ? `${t().closeIn} ${countdown}s` : t().tapContinue);
      },
    });

    this.time.delayedCall(5500, () => {
      overlay.setInteractive();
      overlay.on('pointerdown', () => {
        timer.destroy();
        this.children.list
          .filter(c => ((c as { depth?: number }).depth ?? 0) >= 100)
          .forEach(c => c.destroy());
        /* Kaldığı yerden devam: mevcut score, level, elapsedTime'ı geri ver + kalkan */
        this.scene.start('GameScene', {
          skin:        this.skinIndex,
          revive:      true,
          score:       this.score,
          level:       this.levelReached - 1,   /* 0-tabanlı level index */
          elapsedTime: this.elapsedTime,
          maxCombo:    this.maxCombo,
        });
      });
    });
  }
}
