
/* =========================================================
   PRELOAD SCENE  — no game assets to load (pure Phaser graphics)
   Logo PNG is only used for favicon/PWA, not in-game.
   ========================================================= */

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    /* No in-game images to load — all visuals are drawn with Phaser primitives */
  }

  create() {
    this.scene.start('StartScene');
  }
}
