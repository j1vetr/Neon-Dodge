
/* =========================================================
   START SCENE
   Animated intro: neon title, skin selector, stats preview.
   ========================================================= */

import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLOR_BG, SKINS,
  STORAGE_HIGHSCORE, STORAGE_SKIN,
  STORAGE_GAMES_PLAYED, STORAGE_TOTAL_TIME, STORAGE_MAX_COMBO,
} from '../constants';

export class StartScene extends Phaser.Scene {
  private selectedSkin = 0;
  private skinPreview!: Phaser.GameObjects.Arc;
  private skinLabel!: Phaser.GameObjects.Text;
  private skinGlow!: Phaser.GameObjects.Arc;
  private floatingPlayer!: Phaser.GameObjects.Arc;

  constructor() { super({ key: 'StartScene' }); }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    /* Background */
    this.add.rectangle(W / 2, H / 2, W, H, COLOR_BG);
    this._createStars();
    this._createGrid();
    this._createTitle();

    /* Stats row */
    this._createStatsRow();

    /* High score */
    const hi = parseInt(localStorage.getItem(STORAGE_HIGHSCORE) || '0', 10);
    if (hi > 0) {
      this.add.text(W / 2, H * 0.385, `Best: ${hi}`, {
        fontSize: '17px', fontFamily: 'monospace', color: '#aaffee', alpha: 0.8,
      }).setOrigin(0.5);
    }

    /* Skin selector */
    this.selectedSkin = parseInt(localStorage.getItem(STORAGE_SKIN) || '0', 10);
    this._createSkinSelector();

    /* Tap to start */
    const tapText = this.add.text(W / 2, H * 0.68, 'TAP TO START', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#00ffff', strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: tapText,
      alpha: 0.15, duration: 700, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    /* Input — but not on skin buttons */
    this.input.on('pointerdown', (_ptr: unknown, go: Phaser.GameObjects.GameObject[]) => {
      if (go && go.length > 0) return; // tapped an interactive object
      localStorage.setItem(STORAGE_SKIN, String(this.selectedSkin));
      this.scene.start('GameScene', { skin: this.selectedSkin });
    });

    /* Floating player preview */
    this._createFloatingPlayer();

    /* Version */
    this.add.text(W / 2, H - 18, 'NEON DODGE v2', {
      fontSize: '11px', fontFamily: 'monospace', color: '#223344',
    }).setOrigin(0.5);
  }

  private _createStatsRow() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const gamesPlayed = parseInt(localStorage.getItem(STORAGE_GAMES_PLAYED) || '0', 10);
    const totalTime   = parseFloat(localStorage.getItem(STORAGE_TOTAL_TIME) || '0');
    const maxCombo    = parseInt(localStorage.getItem(STORAGE_MAX_COMBO) || '0', 10);

    if (gamesPlayed === 0) return;

    const cx = W / 2, cy = H * 0.76;

    const col = (x: number, label: string, value: string) => {
      this.add.text(x, cy - 10, value, {
        fontSize: '13px', fontFamily: 'monospace', color: '#667788',
      }).setOrigin(0.5);
      this.add.text(x, cy + 8, label, {
        fontSize: '9px', fontFamily: 'monospace', color: '#334455',
      }).setOrigin(0.5);
    };

    col(cx - W * 0.28, 'GAMES', `${gamesPlayed}`);
    col(cx,             'TIME',  `${Math.floor(totalTime)}s`);
    col(cx + W * 0.28, 'COMBO', `${maxCombo}`);
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
        yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private _createGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x002244, 0.4);
    for (let x = 0; x <= GAME_WIDTH; x += 40) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += 40) g.lineBetween(0, y, GAME_WIDTH, y);
  }

  private _createTitle() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    for (let i = 3; i >= 0; i--) {
      this.add.text(W / 2, H * 0.18, 'NEON', {
        fontSize: '62px', fontFamily: 'monospace',
        color: i === 0 ? '#00ffff' : '#004466',
        stroke: '#00ffff', strokeThickness: i * 4,
        alpha: i === 0 ? 1 : 0.25,
      }).setOrigin(0.5);
    }
    for (let i = 3; i >= 0; i--) {
      this.add.text(W / 2, H * 0.27, 'DODGE', {
        fontSize: '62px', fontFamily: 'monospace',
        color: i === 0 ? '#ff2060' : '#440011',
        stroke: '#ff2060', strokeThickness: i * 4,
        alpha: i === 0 ? 1 : 0.25,
      }).setOrigin(0.5);
    }
  }

  private _createSkinSelector() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H * 0.545;

    this.add.text(cx, cy - 42, 'SKIN', {
      fontSize: '13px', fontFamily: 'monospace', color: '#667788',
    }).setOrigin(0.5);

    this.skinGlow = this.add.circle(cx, cy, 26, SKINS[this.selectedSkin].color, 0.18);
    this.skinPreview = this.add.circle(cx, cy, 16, SKINS[this.selectedSkin].color, 1);
    this.skinLabel = this.add.text(cx, cy + 34, SKINS[this.selectedSkin].name, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aabbcc',
    }).setOrigin(0.5);

    /* Left arrow */
    const lBtn = this.add.text(cx - 60, cy, '◀', {
      fontSize: '22px', fontFamily: 'monospace', color: '#00ffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lBtn.on('pointerdown', () => {
      this.selectedSkin = (this.selectedSkin - 1 + SKINS.length) % SKINS.length;
      this._updateSkin();
    });

    /* Right arrow */
    const rBtn = this.add.text(cx + 60, cy, '▶', {
      fontSize: '22px', fontFamily: 'monospace', color: '#00ffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rBtn.on('pointerdown', () => {
      this.selectedSkin = (this.selectedSkin + 1) % SKINS.length;
      this._updateSkin();
    });
  }

  private _updateSkin() {
    const skin = SKINS[this.selectedSkin];
    this.skinPreview.setFillStyle(skin.color);
    this.skinGlow.setFillStyle(skin.color);
    this.skinLabel.setText(skin.name);
    /* Update floating player preview to match selected skin */
    if (this.floatingPlayer) {
      this.floatingPlayer.setFillStyle(skin.color);
    }
  }

  private _createFloatingPlayer() {
    const skin = SKINS[this.selectedSkin];
    this.floatingPlayer = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT * 0.462, 10, skin.color, 0.85);
    this.tweens.add({
      targets: this.floatingPlayer,
      y: GAME_HEIGHT * 0.462 - 10,
      duration: 900, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
