import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { ASSET_KEYS } from '../assets/AssetManifest';

export type DoorDirection = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export class Door extends Phaser.Physics.Arcade.Sprite {
  public direction: DoorDirection;
  public targetRoomGridX: number;
  public targetRoomGridY: number;
  public isLocked: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: DoorDirection,
    targetGridX: number,
    targetGridY: number
  ) {
    super(scene, x, y, ASSET_KEYS.ENVIRONMENT.DOOR_OPEN);

    this.direction = direction;
    this.targetRoomGridX = targetGridX;
    this.targetRoomGridY = targetGridY;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.DOORS);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      // Ajustar tamanho de colisão de acordo com orientação
      if (direction === 'NORTH' || direction === 'SOUTH') {
        body.setSize(24, 16);
      } else {
        body.setSize(16, 24);
      }
    }
  }

  public setLocked(locked: boolean) {
    this.isLocked = locked;
    this.setTexture(locked ? ASSET_KEYS.ENVIRONMENT.DOOR_LOCKED : ASSET_KEYS.ENVIRONMENT.DOOR_OPEN);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      // Quando trancada, bloqueia a passagem do jogador
      body.checkCollision.none = !locked;
    }
  }
}
