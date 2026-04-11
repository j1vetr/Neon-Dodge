
/* =========================================================
   PRELOAD SCENE — waits for Orbitron font, then starts game
   ========================================================= */

import Phaser from 'phaser';
import { STORAGE_LANG } from '../i18n';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    this.load.image('icon-shield',   '/assets/shield.png');
    this.load.image('icon-double',   '/assets/double.png');
    this.load.image('player-rocket', '/assets/rocket.png');
    this.load.image('icon-menu',     '/assets/icon-menu.png');
    this.load.image('flag-tr',       '/assets/flag-tr.png');
    this.load.image('flag-en',       '/assets/flag-en.png');
  }

  create() {
    document.fonts.load('700 72px Orbitron').finally(() => {
      /* First launch? Show language selection. Otherwise go directly. */
      const hasLang = !!localStorage.getItem(STORAGE_LANG);
      this.scene.start(hasLang ? 'StartScene' : 'LangScene');
    });
  }
}
