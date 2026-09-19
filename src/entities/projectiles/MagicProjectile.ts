import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';
import { ASSET_KEYS } from '../../assets/AssetManifest';

export class MagicProjectile extends Phaser.Physics.Arcade.Sprite {
  public damage: number = 1;
  private lifeTime: number = 3000;

  constructor(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number, speed: number = 75) {
    super(scene, x, y, ASSET_KEYS.ITEMS.PROJECTILE);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.PROJECTILES);

    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCircle(3, 1, 1);
    }
  }

  public override update(time: number, delta: number) {
    super.update(time, delta);
    this.lifeTime -= delta;
    if (this.lifeTime <= 0) {
      this.destroy();
    }
  }
}
