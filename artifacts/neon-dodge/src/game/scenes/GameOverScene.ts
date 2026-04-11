
/* =========================================================
   GAME OVER SCENE  —  clean redesign
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, SKINS,
  STORAGE_GAMES_PLAYED, STORAGE_TOTAL_TIME, STORAGE_MAX_COMBO,
  STORAGE_HIGHSCORE,
} from '../constants';

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private best = 0;
  private skinIndex = 0;
  private levelReached = 1;
  private maxCombo = 0;
  private elapsedTime = 0;

  constructor() { super({ key: 'GameOverScene' }); }

  init(data: {
    score: number; best: number; skin: number;
    level?: number; maxCombo?: number; elapsedTime?: number;
  }) {
    this.score       = data.score ?? 0;
    this.best        = data.best ?? 0;
    this.skinIndex   = data.skin ?? 0;
    this.levelReached = data.level ?? 1;
    this.maxCombo    = data.maxCombo ?? 0;
    this.elapsedTime = data.elapsedTime ?? 0;
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const skin = SKINS[this.skinIndex];

    /* ---- Background ---- */
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.92);
    this._drawGrid();

    /* ---- Top accent line ---- */
    this.add.rectangle(W / 2, 0, W, 3, 0xff2060, 1);

    /* ---- GAME OVER header ---- */
    this._glowText(W / 2, 52, 'GAME OVER', '34px', '#ff2060', '#ff2060');

    /* ---- Player dot ---- */
    this.add.circle(W / 2, 102, 11, skin.color, 1);
    this.add.circle(W / 2, 102, 20, skin.color, 0.12);

    /* ---- Divider ---- */
    this._divider(128);

    /* ---- Score block ---- */
    this._glowText(W / 2, 158, `${this.score}`, '56px', '#ffffff', '#00ffff');
    this.add.text(W / 2, 196, 'SCORE', {
      fontSize: '11px', fontFamily: 'monospace', color: '#334455', letterSpacing: 3,
    }).setOrigin(0.5);

    /* ---- New best badge ---- */
    const newBest = this.score > 0 && this.score >= this.best;
    if (newBest) {
      const nb = this.add.text(W / 2, 218, '★  NEW BEST  ★', {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00',
        stroke: '#885500', strokeThickness: 2,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, alpha: 0.25, duration: 550, yoyo: true, repeat: -1 });
    } else {
      this.add.text(W / 2, 218, `Best  ${this.best}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#334455',
      }).setOrigin(0.5);
    }

    /* ---- Divider ---- */
    this._divider(240);

    /* ---- Stat row: level / time / combo ---- */
    this._statRow(H * 0.38);

    /* ---- Divider ---- */
    this._divider(H * 0.44);

    /* ---- Stats lifetime ---- */
    this._lifetimeStats(H * 0.50);

    /* ---- Divider ---- */
    this._divider(H * 0.57);

    /* ---- Buttons ---- */
    this._makeButton(W / 2, H * 0.645, '▶  WATCH AD  +1 LIFE', '#ffcc00', 210, 38,
      () => this._showAdPlaceholder());

    this._makeButton(W / 2, H * 0.735, '↩  PLAY AGAIN', '#00ffff', 180, 40,
      () => this.scene.start('GameScene', { skin: this.skinIndex }));

    this._makeButton(W / 2, H * 0.825, 'MENU', '#ff2060', 120, 34,
      () => this.scene.start('StartScene'));

    /* ---- Bottom accent ---- */
    this.add.rectangle(W / 2, H, W, 3, 0xff2060, 1);
  }

  /* -------- helpers -------- */

  private _divider(y: number) {
    const g = this.add.graphics();
    g.lineStyle(1, 0x112233, 0.7);
    g.lineBetween(24, y, GAME_WIDTH - 24, y);
  }

  private _statRow(cy: number) {
    const W = GAME_WIDTH;
    const col = (x: number, value: string, label: string, color: string) => {
      this.add.text(x, cy - 10, value, {
        fontSize: '18px', fontFamily: 'monospace', color,
        stroke: color, strokeThickness: 1,
      }).setOrigin(0.5);
      this.add.text(x, cy + 12, label, {
        fontSize: '10px', fontFamily: 'monospace', color: '#445566', letterSpacing: 2,
      }).setOrigin(0.5);
    };

    col(W * 0.22, `LVL ${this.levelReached}`, 'LEVEL', '#00ffcc');
    col(W * 0.50, `${this.elapsedTime}s`, 'SURVIVED', '#aaddff');
    col(W * 0.78, `${this.maxCombo}`, 'MAX COMBO', '#ffcc00');
  }

  private _lifetimeStats(cy: number) {
    const W = GAME_WIDTH;
    const gamesPlayed = parseInt(localStorage.getItem(STORAGE_GAMES_PLAYED) || '0', 10);
    const totalTime   = parseFloat(localStorage.getItem(STORAGE_TOTAL_TIME) || '0');
    const maxComboAll = parseInt(localStorage.getItem(STORAGE_MAX_COMBO) || '0', 10);

    this.add.text(W / 2, cy - 18, 'ALL TIME', {
      fontSize: '10px', fontFamily: 'monospace', color: '#223344', letterSpacing: 4,
    }).setOrigin(0.5);

    const col = (x: number, value: string, label: string) => {
      this.add.text(x, cy, value, {
        fontSize: '14px', fontFamily: 'monospace', color: '#556677',
      }).setOrigin(0.5);
      this.add.text(x, cy + 18, label, {
        fontSize: '9px', fontFamily: 'monospace', color: '#2a3a4a', letterSpacing: 1,
      }).setOrigin(0.5);
    };

    col(W * 0.22, `${gamesPlayed}`, 'GAMES');
    col(W * 0.50, `${Math.floor(totalTime)}s`, 'TOTAL TIME');
    col(W * 0.78, `${maxComboAll}`, 'BEST COMBO');
  }

  private _glowText(x: number, y: number, text: string, size: string, color: string, stroke: string) {
    for (let i = 3; i >= 0; i--) {
      this.add.text(x, y, text, {
        fontSize: size, fontFamily: 'monospace',
        color: i === 0 ? color : '#000000',
        stroke, strokeThickness: i * 3,
        alpha: i === 0 ? 1 : 0.18,
      }).setOrigin(0.5);
    }
  }

  private _makeButton(x: number, y: number, label: string, color: string, w: number, h: number, cb: () => void) {
    const phColor = Phaser.Display.Color.HexStringToColor(color).color;

    const btn = this.add.rectangle(x, y, w, h, 0x000000, 0)
      .setStrokeStyle(2, phColor, 1)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(x, y, label, {
      fontSize: '13px', fontFamily: 'monospace', color,
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
    g.lineStyle(1, 0x001122, 0.18);
    for (let x = 0; x <= GAME_WIDTH; x += 40) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += 40) g.lineBetween(0, y, GAME_WIDTH, y);
  }

  private _showAdPlaceholder() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.94).setDepth(100);
    this.add.rectangle(W / 2, H / 2, W * 0.82, H * 0.38, 0x0a0a18, 1)
      .setStrokeStyle(2, 0xffcc00, 1).setDepth(101);

    this.add.text(W / 2, H * 0.38, 'AD PLACEHOLDER', {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(W / 2, H * 0.46, 'In a real release,\nan ad would play here.', {
      fontSize: '12px', fontFamily: 'monospace', color: '#667788', align: 'center',
    }).setOrigin(0.5).setDepth(102);

    let countdown = 5;
    const cTxt = this.add.text(W / 2, H * 0.55, `Close in ${countdown}s`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#334455',
    }).setOrigin(0.5).setDepth(102);

    const timer = this.time.addEvent({
      delay: 1000, repeat: 4,
      callback: () => {
        countdown--;
        cTxt.setText(countdown > 0 ? `Close in ${countdown}s` : 'Tap to continue');
      },
    });

    this.time.delayedCall(5500, () => {
      overlay.setInteractive();
      overlay.on('pointerdown', () => {
        timer.destroy();
        this.children.list
          .filter(c => ((c as { depth?: number }).depth ?? 0) >= 100)
          .forEach(c => c.destroy());
        this.scene.start('GameScene', { skin: this.skinIndex });
      });
    });
  }
}
