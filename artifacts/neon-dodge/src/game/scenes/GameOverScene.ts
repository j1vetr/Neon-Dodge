
/* =========================================================
   GAME OVER SCENE
   Score display, stats, share button, restart.
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLOR_BG, SKINS,
  STORAGE_GAMES_PLAYED, STORAGE_TOTAL_TIME, STORAGE_MAX_COMBO,
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
    score: number;
    best: number;
    skin: number;
    level?: number;
    maxCombo?: number;
    elapsedTime?: number;
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

    /* Dark overlay */
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88);

    /* Grid faint */
    const g = this.add.graphics();
    g.lineStyle(1, 0x001122, 0.2);
    for (let x = 0; x <= W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) g.lineBetween(0, y, W, y);

    /* GAME OVER title */
    this._glowText(W / 2, H * 0.10, 'GAME OVER', '36px', '#ff2060', '#ff2060');

    /* Score */
    this._glowText(W / 2, H * 0.21, `${this.score}`, '52px', '#ffffff', '#00ffff');
    this.add.text(W / 2, H * 0.29, 'SCORE', {
      fontSize: '13px', fontFamily: 'monospace', color: '#445566',
    }).setOrigin(0.5);

    /* New best */
    const newBest = this.score >= this.best;
    if (newBest && this.score > 0) {
      const nb = this.add.text(W / 2, H * 0.345, '★ NEW BEST! ★', {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00',
        stroke: '#ff8800', strokeThickness: 2,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    } else {
      this.add.text(W / 2, H * 0.345, `Best: ${this.best}`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5);
    }

    /* Stats row */
    this._drawStatsPanel(W / 2, H * 0.42);

    /* Player colour preview */
    const skin = SKINS[this.skinIndex];
    this.add.circle(W / 2, H * 0.565, 10, skin.color, 0.9);
    this.add.circle(W / 2, H * 0.565, 18, skin.color, 0.1);

    /* Level + combo badges */
    const lvlColor = '#00ffcc';
    this.add.text(W / 2 - 56, H * 0.595, `LEVEL ${this.levelReached}`, {
      fontSize: '12px', fontFamily: 'monospace', color: lvlColor,
      stroke: lvlColor, strokeThickness: 1,
    }).setOrigin(0.5);
    if (this.maxCombo >= 3) {
      this.add.text(W / 2 + 56, H * 0.595, `×${Math.min(this.maxCombo + 1, 5)} BEST COMBO`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00',
      }).setOrigin(0.5);
    }

    /* Watch Ad placeholder */
    this._makeButton(
      W / 2, H * 0.645,
      '▶  WATCH AD TO CONTINUE',
      '#000000', '#ffcc00', 220, 34,
      () => this._showAdPlaceholder(),
    );

    /* Restart button */
    this._makeButton(
      W / 2, H * 0.715,
      '↩  PLAY AGAIN',
      '#000000', '#00ffff', 180, 34,
      () => this.scene.start('GameScene', { skin: this.skinIndex }),
    );

    /* Share button */
    this._makeButton(
      W / 2 - 56, H * 0.785,
      '⬆ SHARE',
      '#000000', '#88ffcc', 100, 32,
      () => this._shareScore(),
    );

    /* Menu */
    this._makeButton(
      W / 2 + 56, H * 0.785,
      'MENU',
      '#000000', '#ff2060', 100, 32,
      () => this.scene.start('StartScene'),
    );
  }

  /* ---- Stats panel ---- */
  private _drawStatsPanel(cx: number, cy: number) {
    const W = GAME_WIDTH;
    const gamesPlayed = parseInt(localStorage.getItem(STORAGE_GAMES_PLAYED) || '0', 10);
    const totalTime   = parseFloat(localStorage.getItem(STORAGE_TOTAL_TIME) || '0');
    const maxComboAll = parseInt(localStorage.getItem(STORAGE_MAX_COMBO) || '0', 10);

    /* Panel background */
    const panel = this.add.rectangle(cx, cy, W * 0.86, 72, 0x001122, 0.55);
    panel.setStrokeStyle(1, 0x003344, 0.6);

    const col = (x: number, label: string, value: string) => {
      this.add.text(x, cy - 14, value, {
        fontSize: '15px', fontFamily: 'monospace', color: '#aaddff',
      }).setOrigin(0.5);
      this.add.text(x, cy + 12, label, {
        fontSize: '10px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5);
    };

    col(cx - W * 0.27, 'GAMES', `${gamesPlayed}`);
    col(cx,             'TIME', `${Math.floor(totalTime)}s`);
    col(cx + W * 0.27, 'MAX COMBO', `${maxComboAll}`);
  }

  /* ---- Share ---- */
  private _shareScore() {
    const text = `🎮 Neon Dodge — Score: ${this.score} | Level ${this.levelReached} | Max Combo: ${this.maxCombo} 🔥 Can you beat me?`;
    if (navigator.share) {
      navigator.share({ title: 'Neon Dodge', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        this._showToast('Copied to clipboard!');
      }).catch(() => {
        this._showToast(text);
      });
    }
  }

  private _showToast(msg: string) {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const toast = this.add.text(W / 2, H * 0.92, msg, {
      fontSize: '12px', fontFamily: 'monospace', color: '#00ffcc',
      backgroundColor: '#001122',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
    }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({
      targets: toast, alpha: 1, duration: 200,
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({ targets: toast, alpha: 0, duration: 300, onComplete: () => toast.destroy() });
        });
      },
    });
  }

  private _glowText(x: number, y: number, text: string, size: string, color: string, stroke: string) {
    for (let i = 3; i >= 0; i--) {
      this.add.text(x, y, text, {
        fontSize: size, fontFamily: 'monospace',
        color: i === 0 ? color : '#000000',
        stroke,
        strokeThickness: i * 3,
        alpha: i === 0 ? 1 : 0.2,
      }).setOrigin(0.5);
    }
  }

  private _makeButton(
    x: number, y: number, label: string,
    textColor: string, bgColor: string,
    w: number, h: number, cb: () => void,
  ) {
    const btn = this.add.rectangle(x, y, w, h, 0x000000, 0.0)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(bgColor).color, 1)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(x, y, label, {
      fontSize: '12px', fontFamily: 'monospace', color: bgColor,
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(Phaser.Display.Color.HexStringToColor(bgColor).color, 0.15));
    btn.on('pointerout',  () => btn.setFillStyle(0x000000, 0.0));
    btn.on('pointerdown', () => {
      this.tweens.add({ targets: [btn, txt], scaleX: 0.95, scaleY: 0.95, duration: 60, yoyo: true });
      this.time.delayedCall(100, cb);
    });
  }

  private _showAdPlaceholder() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.93).setDepth(100);
    this.add.rectangle(W / 2, H / 2, W * 0.82, H * 0.44, 0x111122, 1)
      .setStrokeStyle(2, 0xffcc00, 1).setDepth(101);

    this.add.text(W / 2, H * 0.36, '📺  AD PLACEHOLDER', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(W / 2, H * 0.44, 'In a real release, an ad\nwould play here.', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aabbcc',
      align: 'center',
    }).setOrigin(0.5).setDepth(102);

    let countdown = 5;
    const cTxt = this.add.text(W / 2, H * 0.54, `Close in ${countdown}s`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#556677',
    }).setOrigin(0.5).setDepth(102);

    const timer = this.time.addEvent({
      delay: 1000, repeat: 4,
      callback: () => {
        countdown--;
        cTxt.setText(countdown > 0 ? `Close in ${countdown}s` : 'Tap to continue');
      },
    });

    const close = () => {
      timer.destroy();
      this.children.list
        .filter(c => (c as Phaser.GameObjects.GameObject & { depth?: number }).depth != null &&
                     ((c as Phaser.GameObjects.GameObject & { depth?: number }).depth ?? 0) >= 100)
        .forEach(c => c.destroy());
      this.scene.start('GameScene', { skin: this.skinIndex });
    };

    this.time.delayedCall(5500, () => {
      overlay.setInteractive();
      overlay.on('pointerdown', close);
    });
  }
}
