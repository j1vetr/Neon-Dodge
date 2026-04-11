
/* =========================================================
   START SCENE
   Animated intro screen: neon title + "Tap to Start"
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLOR_BG, COLOR_PLAYER, SKINS,
  STORAGE_HIGHSCORE, STORAGE_SKIN,
} from '../constants';

export class StartScene extends Phaser.Scene {
  private selectedSkin = 0;
  private skinPreview!: Phaser.GameObjects.Arc;
  private skinLabel!: Phaser.GameObjects.Text;
  private skinGlow!: Phaser.GameObjects.Arc;

  constructor() { super({ key: 'StartScene' }); }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* Background */
    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);

    /* Star field */
    this._createStars();

    /* Grid lines (perspective feel) */
    this._createGrid();

    /* Neon title */
    this._createTitle();

    /* High score */
    const hi = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    if (hi > 0) {
      this.add.text(W / 2, H * 0.38, `Best: ${hi}s`, {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#aaffee',
        alpha: 0.8,
      }).setOrigin(0.5);
    }

    /* Skin selector */
    this.selectedSkin = parseInt(localStorage.getItem(STORAGE_SKIN) || '0', 10);
    this._createSkinSelector();

    /* Tap to start pulse text */
    const tapText = this.add.text(W / 2, H * 0.68, 'TAP TO START', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#00ffff',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: tapText,
      alpha: 0.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    /* Input */
    this.input.on('pointerdown', () => {
      localStorage.setItem(STORAGE_SKIN, String(this.selectedSkin));
      this.scene.start('GameScene', { skin: this.selectedSkin });
    });

    /* Floating player preview */
    this._createFloatingPlayer();

    /* Version / credits */
    this.add.text(W / 2, H - 18, 'NEON DODGE', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#334455',
    }).setOrigin(0.5);
  }

  private _createStars() {
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const r = Math.random() * 1.5 + 0.3;
      const alpha = Math.random() * 0.6 + 0.1;
      const star = this.add.circle(x, y, r, 0xffffff, alpha);
      this.tweens.add({
        targets: star,
        alpha: { from: alpha, to: alpha * 0.2 },
        duration: Phaser.Math.Between(800, 2500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private _createGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x002244, 0.4);
    // Vertical
    for (let x = 0; x <= GAME_WIDTH; x += 40) {
      g.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    // Horizontal
    for (let y = 0; y <= GAME_HEIGHT; y += 40) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private _createTitle() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    /* Glow layers */
    for (let i = 3; i >= 0; i--) {
      this.add.text(W / 2, H * 0.18, 'NEON', {
        fontSize: '62px',
        fontFamily: 'monospace',
        color: i === 0 ? '#00ffff' : '#004466',
        stroke: '#00ffff',
        strokeThickness: i * 4,
        alpha: i === 0 ? 1 : 0.25,
      }).setOrigin(0.5);
    }
    for (let i = 3; i >= 0; i--) {
      this.add.text(W / 2, H * 0.27, 'DODGE', {
        fontSize: '62px',
        fontFamily: 'monospace',
        color: i === 0 ? '#ff2060' : '#440011',
        stroke: '#ff2060',
        strokeThickness: i * 4,
        alpha: i === 0 ? 1 : 0.25,
      }).setOrigin(0.5);
    }
  }

  private _createSkinSelector() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H * 0.54;

    this.add.text(cx, cy - 42, 'SKIN', {
      fontSize: '13px', fontFamily: 'monospace', color: '#667788',
    }).setOrigin(0.5);

    /* Glow circle behind preview */
    this.skinGlow = this.add.circle(cx, cy, 26, SKINS[this.selectedSkin].color, 0.18);
    this.skinPreview = this.add.circle(cx, cy, 16, SKINS[this.selectedSkin].color, 1);
    this.skinLabel = this.add.text(cx, cy + 34, SKINS[this.selectedSkin].name, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aabbcc',
    }).setOrigin(0.5);

    /* Left arrow */
    const lBtn = this.add.text(cx - 60, cy, '◀', {
      fontSize: '22px', fontFamily: 'monospace', color: '#00ffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lBtn.on('pointerdown', (e: Event) => {
      e.stopPropagation?.();
      this.selectedSkin = (this.selectedSkin - 1 + SKINS.length) % SKINS.length;
      this._updateSkin();
    });

    /* Right arrow */
    const rBtn = this.add.text(cx + 60, cy, '▶', {
      fontSize: '22px', fontFamily: 'monospace', color: '#00ffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rBtn.on('pointerdown', (e: Event) => {
      e.stopPropagation?.();
      this.selectedSkin = (this.selectedSkin + 1) % SKINS.length;
      this._updateSkin();
    });
  }

  private _updateSkin() {
    const skin = SKINS[this.selectedSkin];
    this.skinPreview.setFillStyle(skin.color);
    this.skinGlow.setFillStyle(skin.color);
    this.skinLabel.setText(skin.name);
  }

  private _createFloatingPlayer() {
    const skin = SKINS[this.selectedSkin];
    const p = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT * 0.46, 10, skin.color, 0);
    // subtle bounce
    this.tweens.add({
      targets: p, y: GAME_HEIGHT * 0.46 - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }
}
