
/* =========================================================
   LANG SCENE — First-launch language selection bubble
   ========================================================= */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BG } from '../constants';
import { setLang, t } from '../i18n';

export class LangScene extends Phaser.Scene {
  constructor() { super({ key: 'LangScene' }); }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* Dark background */
    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);

    /* Subtle star field */
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const r = Math.random() * 2.4 + 0.6;
      const col = [0xffffff, 0x00ffff, 0xff2060][Math.floor(Math.random() * 3)];
      this.add.circle(x, y, r, col, Math.random() * 0.3 + 0.05);
    }

    /* ---- Balloon panel ---- */
    const PW = 560, PH = 520;
    const panelY = H / 2;

    /* Panel shadow/glow */
    this.add.rectangle(W / 2, panelY, PW + 12, PH + 12, 0x00ffff, 0.06);

    /* Panel bg */
    this.add.rectangle(W / 2, panelY, PW, PH, 0x080820, 1)
      .setStrokeStyle(3, 0x00ffff, 0.7);

    /* Title */
    const titleStr = t().selectLang;
    this.add.text(W / 2, panelY - PH / 2 + 60, titleStr, {
      fontSize: '28px', fontFamily: 'monospace',
      color: '#050510', stroke: '#00ffff', strokeThickness: 3,
      letterSpacing: 2,
    }).setOrigin(0.5);

    /* Thin divider under title */
    const dg = this.add.graphics();
    dg.lineStyle(2, 0x00ffff, 0.15);
    dg.lineBetween(W / 2 - 180, panelY - PH / 2 + 96, W / 2 + 180, panelY - PH / 2 + 96);

    /* ---- Flag options ---- */
    const flagGap = 160;
    const flagY = panelY - 20;

    this._makeFlag(W / 2 - flagGap, flagY, 'flag-tr', 'TR', 'TÜRKÇE', () => {
      setLang('tr');
      this.scene.start('StartScene');
    });

    this._makeFlag(W / 2 + flagGap, flagY, 'flag-en', 'EN', 'ENGLISH', () => {
      setLang('en');
      this.scene.start('StartScene');
    });

    /* Hint text */
    const hint = t().changeLater;
    this.add.text(W / 2, panelY + PH / 2 - 44, hint, {
      fontSize: '18px', fontFamily: 'monospace', color: '#1e2e38', letterSpacing: 1,
    }).setOrigin(0.5);
  }

  private _makeFlag(x: number, y: number, key: string, code: string, label: string, cb: () => void) {
    const SIZE = 128;

    /* Hover highlight */
    const highlight = this.add.rectangle(x, y, SIZE + 20, SIZE + 72, 0x00ffff, 0)
      .setStrokeStyle(2, 0x00ffff, 0);

    /* Flag image */
    const flag = this.add.image(x, y - 20, key)
      .setDisplaySize(SIZE, SIZE)
      .setInteractive({ useHandCursor: true });

    /* Save base scale AFTER setDisplaySize so hover is relative */
    const baseScale = flag.scaleX;

    /* Language label */
    const lbl = this.add.text(x, y + SIZE / 2 - 8, label, {
      fontSize: '22px', fontFamily: 'monospace', color: '#445566',
    }).setOrigin(0.5);

    /* Hover states */
    flag.on('pointerover', () => {
      flag.setScale(baseScale * 1.08);
      highlight.setStrokeStyle(2, 0x00ffff, 0.4);
      highlight.setFillStyle(0x00ffff, 0.05);
      lbl.setColor('#00ffff');
    });
    flag.on('pointerout', () => {
      flag.setScale(baseScale);
      highlight.setStrokeStyle(2, 0x00ffff, 0);
      highlight.setFillStyle(0x000000, 0);
      lbl.setColor('#445566');
    });

    /* Click — scale flash then start */
    flag.on('pointerdown', () => {
      this.tweens.add({
        targets: flag, scaleX: baseScale * 0.92, scaleY: baseScale * 0.92,
        duration: 70, yoyo: true,
        onComplete: () => cb(),
      });
    });

    /* Gentle float */
    this.tweens.add({
      targets: [flag, lbl],
      y: '-=10',
      duration: 1400 + Math.random() * 400,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 300,
    });

    void code;
    void highlight;
  }
}
