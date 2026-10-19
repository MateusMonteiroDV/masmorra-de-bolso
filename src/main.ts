import * as Phaser from 'phaser';
import { CONSTANTS } from './core/Constants';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { HubScene } from './scenes/HubScene';
import { LobbyScene } from './scenes/LobbyScene';
import { DungeonScene } from './scenes/DungeonScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';
import { preloadTurnServers } from './network/TurnConfig';
import { RemoteLogger } from './systems/RemoteLogger';

RemoteLogger.init();
void preloadTurnServers();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CONSTANTS.GAME_WIDTH,
    height: CONSTANTS.GAME_HEIGHT,
    parent: 'game-container',
    expandParent: true
  },
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#090a0f',
  input: {
    activePointers: 3
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
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

let lastWidth = Math.round(game.scale.width);
let lastHeight = Math.round(game.scale.height);
let resizeTimer: number | null = null;

game.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
  const newW = Math.round(gameSize.width);
  const newH = Math.round(gameSize.height);
  if (Math.abs(newW - lastWidth) < 4 && Math.abs(newH - lastHeight) < 4) return;
  lastWidth = newW;
  lastHeight = newH;

  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const restartableScenes = ['TitleScene', 'HubScene', 'LobbyScene', 'UIScene'];
    restartableScenes.forEach(key => {
      if (game.scene.isActive(key)) {
        const sc = game.scene.getScene(key) as any;
        if (key === 'TitleScene' && sc.hasStarted) return;
        if (key === 'LobbyScene' && sc.isCountingDown) return;
        sc.scene.restart();
      }
    });
  }, 120);
});

game.events.on(Phaser.Core.Events.READY, () => {
  lastWidth = Math.round(game.scale.width);
  lastHeight = Math.round(game.scale.height);
  game.scene.scenes.forEach(scene => {
    scene.events.on(Phaser.Scenes.Events.CREATE, () => {
      RemoteLogger.setScene(scene.scene.key);
      RemoteLogger.info(`Cena iniciada: ${scene.scene.key}`);
    });
  });
});

