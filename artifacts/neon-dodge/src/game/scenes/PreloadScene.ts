
/* =========================================================
   PRELOAD SCENE — waits for Orbitron font, then starts game
   ========================================================= */

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    this.load.image('icon-shield', '/assets/shield.png');
  }

  create() {
    /* Wait for Orbitron to be fully loaded before StartScene renders */
    document.fonts.load('700 72px Orbitron').finally(() => {
      this.scene.start('StartScene');
    });
  }
}
