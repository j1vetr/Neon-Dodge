
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
import { MultiLobbyScene } from './scenes/MultiLobbyScene';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BG } from './constants';

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: `#${COLOR_BG.toString(16).padStart(6, '0')}`,
    parent,
    scene: [PreloadScene, LangScene, StartScene, GameScene, GameOverScene, MultiLobbyScene],
    dom: { createContainer: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 3,
      touch: {
        /* passive:false → Phaser'ın kendi touch handler'ları da
           preventDefault çağırabilsin (iOS kaydırma engellemesi) */
        capture: true,
      },
    },
    antialias: true,
    roundPixels: true,
    render: {
      antialias: true,
      antialiasGL: true,
      pixelArt: false,
      powerPreference: 'high-performance',
    },
  };

  return new Phaser.Game(config);
}
