import * as Phaser from 'phaser';
import { CONSTANTS } from './core/Constants';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { HubScene } from './scenes/HubScene';
import { LobbyScene } from './scenes/LobbyScene';
import { DungeonScene } from './scenes/DungeonScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CONSTANTS.GAME_WIDTH,
    height: CONSTANTS.GAME_HEIGHT
  },
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#090a0f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    HubScene,
    LobbyScene,
    DungeonScene,
    UIScene,
    GameOverScene
  ]
};

export const game = new Phaser.Game(config);
