import * as Phaser from 'phaser';

/**
 * EventBus desacoplado global.
 * Permite que cenas (DungeonScene, UIScene, HubScene) conversem
 * sem precisar de acoplamento direto ou referências globais confusas.
 */
class GameEventBus extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }
}

export const EventBus = new GameEventBus();
