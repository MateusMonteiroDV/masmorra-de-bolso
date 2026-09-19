import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';

export class SlimeEnemy extends Enemy {
  private hopTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, dropGroup?: Phaser.GameObjects.Group) {
    super(
      scene,
      x,
      y,
      'slime_d_00',
      CONSTANTS.ENEMIES.SLIME.HP,
      CONSTANTS.ENEMIES.SLIME.SPEED,
      CONSTANTS.ENEMIES.SLIME.XP_OR_GOLD,
      dropGroup
    );

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(28, 20);
      body.setOffset(18, 30);
    }

    this.play('slime_walk_d');
  }

  public override aiBehavior(player: Phaser.GameObjects.Sprite, delta: number) {
    if (!this.active || this.health.isDead()) return;

    this.hopTimer += delta;

    // Perseguição contínua em direção a Roberto
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.movement.baseSpeed * (0.8 + Math.sin(this.hopTimer * 0.008) * 0.35);

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (player.x < this.x) {
      if (this.anims.currentAnim?.key !== 'slime_walk_e') {
        this.play('slime_walk_e', true);
      }
    } else {
      if (this.anims.currentAnim?.key !== 'slime_walk_d') {
        this.play('slime_walk_d', true);
      }
    }
  }
}
