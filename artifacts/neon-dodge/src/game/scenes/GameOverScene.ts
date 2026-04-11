
/* =========================================================
   GAME OVER SCENE
   Score display, high score, "Watch Ad" placeholder,
   restart and skin pick buttons.
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLOR_BG, SKINS,
} from '../constants';

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private best = 0;
  private skinIndex = 0;
  private levelReached = 1;

  constructor() { super({ key: 'GameOverScene' }); }

  init(data: { score: number; best: number; skin: number; level?: number }) {
    this.score = data.score ?? 0;
    this.best = data.best ?? 0;
    this.skinIndex = data.skin ?? 0;
    this.levelReached = data.level ?? 1;
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* Dark overlay */
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85);

    /* Grid faint */
    const g = this.add.graphics();
    g.lineStyle(1, 0x001122, 0.2);
    for (let x = 0; x <= W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) g.lineBetween(0, y, W, y);

    /* GAME OVER title */
    this._glowText(W / 2, H * 0.20, 'GAME OVER', '38px', '#ff2060', '#ff2060');

    /* Score */
    this._glowText(W / 2, H * 0.33, `${this.score}s`, '54px', '#ffffff', '#00ffff');
    this.add.text(W / 2, H * 0.42, 'SURVIVED', {
      fontSize: '15px', fontFamily: 'monospace', color: '#667788',
    }).setOrigin(0.5);

    /* Best */
    const newBest = this.score >= this.best;
    if (newBest && this.score > 0) {
      const nb = this.add.text(W / 2, H * 0.49, '★ NEW BEST! ★', {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffcc00',
        stroke: '#ff8800', strokeThickness: 2,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    } else {
      this.add.text(W / 2, H * 0.49, `Best: ${this.best}s`, {
        fontSize: '16px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5);
    }

    /* Level reached badge */
    const lvlColor = '#00ffcc';
    this.add.text(W / 2, H * 0.555, `LEVEL ${this.levelReached} REACHED`, {
      fontSize: '14px', fontFamily: 'monospace', color: lvlColor,
      stroke: lvlColor, strokeThickness: 1,
    }).setOrigin(0.5);

    /* Player colour preview */
    const skin = SKINS[this.skinIndex];
    this.add.circle(W / 2, H * 0.615, 12, skin.color, 0.9);
    this.add.circle(W / 2, H * 0.615, 20, skin.color, 0.12);

    /* Watch Ad placeholder */
    this._makeButton(
      W / 2, H * 0.66,
      '▶  WATCH AD TO CONTINUE',
      '#000000', '#ffcc00', 220, 38,
      () => this._showAdPlaceholder(),
    );

    /* Restart button */
    this._makeButton(
      W / 2, H * 0.76,
      '↩  PLAY AGAIN',
      '#000000', '#00ffff', 180, 38,
      () => this.scene.start('GameScene', { skin: this.skinIndex }),
    );

    /* Menu */
    this._makeButton(
      W / 2, H * 0.85,
      'MENU',
      '#000000', '#ff2060', 100, 34,
      () => this.scene.start('StartScene'),
    );
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
      fontSize: '13px', fontFamily: 'monospace', color: bgColor,
    }).setOrigin(0.5);

    btn.on('pointerover', () => {
      btn.setFillStyle(Phaser.Display.Color.HexStringToColor(bgColor).color, 0.15);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(0x000000, 0.0);
    });
    btn.on('pointerdown', () => {
      this.tweens.add({
        targets: [btn, txt], scaleX: 0.95, scaleY: 0.95,
        duration: 60, yoyo: true,
      });
      this.time.delayedCall(100, cb);
    });
  }

  private _showAdPlaceholder() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.93).setDepth(100);
    const box = this.add.rectangle(W / 2, H / 2, W * 0.82, H * 0.44, 0x111122, 1)
      .setStrokeStyle(2, 0xffcc00, 1).setDepth(101);

    this.add.text(W / 2, H * 0.36, '📺  AD PLACEHOLDER', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(W / 2, H * 0.44, 'In a real release, an ad\nwould play here.', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aabbcc',
      align: 'center',
    }).setOrigin(0.5).setDepth(102);

    /* Countdown */
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
      overlay.destroy(); box.destroy();
      this.children.list.filter(c => (c as Phaser.GameObjects.GameObject).depth >= 100).forEach(c => c.destroy());
      /* Grant 1 continue — restart from game over with score preserved */
      this.scene.start('GameScene', { skin: this.skinIndex });
    };

    this.time.delayedCall(5500, () => {
      overlay.setInteractive();
      overlay.on('pointerdown', close);
    });
  }
}
