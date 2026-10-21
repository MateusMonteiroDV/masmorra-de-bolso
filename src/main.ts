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
if (typeof window !== 'undefined') {
  (window as any).game = game;
}

let resizeTimer: number | null = null;
const sceneCreatedSize: Record<string, { w: number; h: number }> = {};

game.scale.on('resize', () => {
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const curW = Math.round(game.scale.width);
    const curH = Math.round(game.scale.height);
    const restartableScenes = ['TitleScene', 'HubScene', 'LobbyScene', 'UIScene'];
    restartableScenes.forEach(key => {
      if (game.scene.isActive(key)) {
        const sc = game.scene.getScene(key) as any;
        if (key === 'TitleScene' && sc.hasStarted) return;
        if (key === 'LobbyScene' && sc.isCountingDown) return;
        if (key === 'HubScene' && sc.isModalOpen) return;
        const created = sceneCreatedSize[key];
        if (created && Math.abs(curW - created.w) < 6 && Math.abs(curH - created.h) < 6) {
          return;
        }
        sc.scene.restart();
      }
    });
  }, 150);
});

game.events.on(Phaser.Core.Events.READY, () => {
  game.scene.scenes.forEach(scene => {
    scene.events.on(Phaser.Scenes.Events.CREATE, () => {
      sceneCreatedSize[scene.scene.key] = {
        w: Math.round(scene.scale.width),
        h: Math.round(scene.scale.height)
      };
      RemoteLogger.setScene(scene.scene.key);
      RemoteLogger.info(`Cena iniciada: ${scene.scene.key}`);
    });
  });
});

