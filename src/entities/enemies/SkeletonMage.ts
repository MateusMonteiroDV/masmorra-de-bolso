import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';
import { ASSET_KEYS } from '../../assets/AssetManifest';
import { MagicProjectile } from '../projectiles/MagicProjectile';
import { AudioService } from '../../systems/AudioService';

export class SkeletonMage extends Enemy {
  private castTimer: number = CONSTANTS.ENEMIES.MAGE.COOLDOWN;
  private projectileGroup?: Phaser.GameObjects.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dropGroup?: Phaser.GameObjects.Group,
    projectileGroup?: Phaser.GameObjects.Group
  ) {
    super(
      scene,
      x,
      y,
      ASSET_KEYS.CHARACTERS.MAGE,
      CONSTANTS.ENEMIES.MAGE.HP,
      CONSTANTS.ENEMIES.MAGE.SPEED,
      CONSTANTS.ENEMIES.MAGE.XP_OR_GOLD,
      dropGroup
    );

    this.projectileGroup = projectileGroup;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(10, 12);
      body.setOffset(3, 2);
    }
  }

  public override aiBehavior(player: Phaser.GameObjects.Sprite, delta: number) {
    if (!this.active || this.health.isDead() || !player || !player.active) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

    // Kiting: Mantém distância do herói
    if (dist < 70) {
      // Muito perto: foge na direção oposta
      this.setVelocity(-Math.cos(angle) * this.movement.baseSpeed, -Math.sin(angle) * this.movement.baseSpeed);
    } else if (dist > 140) {
      // Muito longe: aproxima-se com cautela
      this.setVelocity(Math.cos(angle) * this.movement.baseSpeed, Math.sin(angle) * this.movement.baseSpeed);
    } else {
      // Distância ideal de conjuração: fica parado ou desliza lateralmente
      this.setVelocity(0, 0);
    }

    if (player.x < this.x) {
      this.setFlipX(true);
    } else {
      this.setFlipX(false);
    }

    // Temporizador de magia
    this.castTimer -= delta;
    if (this.castTimer <= 0 && dist < CONSTANTS.ENEMIES.MAGE.ATTACK_RANGE) {
      this.castTimer = CONSTANTS.ENEMIES.MAGE.COOLDOWN;
      this.castSpell(player.x, player.y);
    }
  }

  private castSpell(targetX: number, targetY: number) {
    if (!this.scene) return;

    AudioService.playMagicCast();

    // Flash visual de conjuração
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.25,
      scaleY: 1.25,
      yoyo: true,
      duration: 100
    });

    const projectile = new MagicProjectile(
      this.scene,
      this.x,
      this.y,
      targetX,
      targetY,
      CONSTANTS.ENEMIES.MAGE.PROJECTILE_SPEED
    );

    if (this.projectileGroup) {
      this.projectileGroup.add(projectile);
    }
  }
}
