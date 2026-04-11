
/* =========================================================
   PRELOAD SCENE  — loads assets, processes logo transparency
   ========================================================= */

import Phaser from 'phaser';
import { COLOR_BG } from '../constants';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    this.load.image('logo_raw', '/logo.png');
  }

  create() {
    /* ── Process the logo: render it on a solid dark background so that
       Canvas renderer (no-GPU environments) doesn't bleed transparent
       corners as white. We use Phaser's CanvasTexture API which is
       natively understood by the renderer.                           */

    const src = this.textures.get('logo_raw').getSourceImage() as HTMLImageElement;
    const w = src.naturalWidth  || src.width  || 512;
    const h = src.naturalHeight || src.height || 512;

    /* Create a Phaser-managed canvas texture of the same size */
    const canvasTex = this.textures.createCanvas('logo', w, h);
    const ctx = canvasTex.context;

    /* 1. Opaque game-background fill */
    const bgHex = '#' + COLOR_BG.toString(16).padStart(6, '0');
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);

    /* 2. Draw original logo over it (transparent corners → now dark bg) */
    ctx.drawImage(src, 0, 0, w, h);

    /* 3. Flush the canvas into the GPU texture */
    canvasTex.refresh();

    this.scene.start('StartScene');
  }
}
