import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';
import { ASSET_KEYS } from '../../assets/AssetManifest';

export class BatEnemy extends Enemy {
  private waveAngle: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, dropGroup?: Phaser.GameObjects.Group) {
    super(
      scene,
      x,
      y,
      ASSET_KEYS.CHARACTERS.BAT,
      CONSTANTS.ENEMIES.BAT.HP,
      CONSTANTS.ENEMIES.BAT.SPEED,
      CONSTANTS.ENEMIES.BAT.XP_OR_GOLD,
      dropGroup
    );

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(10, 8);
      body.setOffset(3, 4);
    }
  }

  public override aiBehavior(player: Phaser.GameObjects.Sprite, delta: number) {
    if (!this.active || this.health.isDead() || !player || !player.active) return;

    this.waveAngle += delta * 0.008;

    // Movimentação em zigue-zague errático típica de morcego
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const erraticOffset = Math.sin(this.waveAngle) * 0.8;
    const finalAngle = baseAngle + erraticOffset;

    this.setVelocity(
      Math.cos(finalAngle) * this.movement.baseSpeed,
      Math.sin(finalAngle) * this.movement.baseSpeed
    );

    if (player.x < this.x) {
      this.setFlipX(true);
    } else {
      this.setFlipX(false);
    }
  }
}
