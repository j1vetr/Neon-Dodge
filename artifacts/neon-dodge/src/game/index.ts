
/* =========================================================
   GAME BOOTSTRAP
   Creates the Phaser game instance with all scenes.
   Fully responsive — fills the container element.
   ========================================================= */

import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { LangScene } from './scenes/LangScene';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BG } from './constants';

export function createGame(parent: HTMLElement): Phaser.Game {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: `#${COLOR_BG.toString(16).padStart(6, '0')}`,
    parent,
    scene: [PreloadScene, LangScene, StartScene, GameScene, GameOverScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 3,
    },
    resolution: dpr,
    antialias: true,
    roundPixels: true,
    render: {
      antialias: true,
      antialiasGL: true,
      pixelArt: false,
      powerPreference: 'high-performance',
      resolution: dpr,
    },
  };

  return new Phaser.Game(config);
}
