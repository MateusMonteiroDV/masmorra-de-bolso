import * as Phaser from 'phaser';
import { CONSTANTS } from './core/Constants';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HubScene } from './scenes/HubScene';
import { DungeonScene } from './scenes/DungeonScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';

// Previne que o navegador e o gerenciador de entrada do sistema (como IBus no Linux/Wayland com Chromium/Brave)
// interceptem as teclas de movimento (WASD) e abram caixas de composição/números no canto superior esquerdo (0,0)
window.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }
  const gameKeys = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'KeyQ', 'KeyE', 'KeyF', 'KeyJ', 'KeyK',
    'Space', 'ShiftLeft', 'ShiftRight',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
  ];
  if (gameKeys.includes(e.code)) {
    e.preventDefault();
  }
}, { passive: false });

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
    HubScene,
    DungeonScene,
    UIScene,
    GameOverScene
  ]
};

export const game = new Phaser.Game(config);
