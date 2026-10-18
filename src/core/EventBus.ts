import * as Phaser from 'phaser';

/**
 * EventBus desacoplado global.
 * Permite que cenas (DungeonScene, UIScene, HubScene) conversem
 * sem precisar de acoplamento direto ou referências globais confusas.
 */
export const EventBus = new Phaser.Events.EventEmitter();

