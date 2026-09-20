import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';
import { ASSET_KEYS } from '../../assets/AssetManifest';
import { MagicProjectile } from '../projectiles/MagicProjectile';
import { AudioService } from '../../systems/AudioService';

export class SkeletonMage extends Enemy {
  private castTimer: number = CONSTANTS.ENEMIES.MAGE.COOLDOWN;
  private projectileGroup?: Phaser.GameObjects.Group;
  private isCasting: boolean = false;
  private facing: 'd' | 'e' = 'e';

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
      'mago_e_00',
      CONSTANTS.ENEMIES.MAGE.HP,
      CONSTANTS.ENEMIES.MAGE.SPEED,
      CONSTANTS.ENEMIES.MAGE.XP_OR_GOLD,
      dropGroup
    );

    this.projectileGroup = projectileGroup;

    // Corpo físico 64x64 ajustado à silhueta do esqueleto
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(18, 30);
      body.setOffset(18, 32);
    }

    this.play('mago_walk_e');
  }

  public override aiBehavior(player: Phaser.GameObjects.Sprite, delta: number) {
    if (!this.active || this.health.isDead() || !player || !player.active) return;

    if (this.isCasting) return; // Mantém parado enquanto conjura

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

    if (player.x < this.x) {
      this.facing = 'e';
    } else {
      this.facing = 'd';
    }

    // Kiting: Mantém distância tática do herói
    if (dist < 75) {
      // Muito perto: foge na direção oposta
      this.setVelocity(-Math.cos(angle) * this.movement.baseSpeed, -Math.sin(angle) * this.movement.baseSpeed);
    } else if (dist > 150) {
      // Muito longe: aproxima-se com cautela
      this.setVelocity(Math.cos(angle) * this.movement.baseSpeed, Math.sin(angle) * this.movement.baseSpeed);
    } else {
      // Distância ideal de combate
      this.setVelocity(0, 0);
    }

    // Animação de caminhada com o cajado
    const walkAnim = this.facing === 'd' ? 'mago_walk_d' : 'mago_walk_e';
    if (this.anims.currentAnim?.key !== walkAnim) {
      this.play(walkAnim, true);
    }

    this.setFlipX(false);

    // Temporizador de magia
    this.castTimer -= delta;
    if (this.castTimer <= 0 && dist < CONSTANTS.ENEMIES.MAGE.ATTACK_RANGE) {
      this.castTimer = CONSTANTS.ENEMIES.MAGE.COOLDOWN;
      this.startCast(player.x, player.y);
    }
  }

  private startCast(targetX: number, targetY: number) {
    if (!this.scene || !this.active || this.health.isDead()) return;

    this.isCasting = true;
    this.setVelocity(0, 0);

    // Vira para o alvo antes de conjurar
    this.facing = targetX < this.x ? 'e' : 'd';
    const castAnim = this.facing === 'd' ? 'mago_cast_d' : 'mago_cast_e';
    this.play(castAnim, true);

    AudioService.playMagicCast();

    // No instante de ápice da magia (quando a chama queima no cajado):
    this.scene.time.delayedCall(200, () => {
      if (!this.active || this.health.isDead()) {
        this.isCasting = false;
        return;
      }

      // Origem do projétil saindo da ponta do cajado em chamas
      const staffOffsetX = this.facing === 'd' ? 14 : -14;
      const staffOffsetY = -8;

      const projectile = new MagicProjectile(
        this.scene,
        this.x + staffOffsetX,
        this.y + staffOffsetY,
        targetX,
        targetY,
        CONSTANTS.ENEMIES.MAGE.PROJECTILE_SPEED
      );

      if (this.projectileGroup) {
        this.projectileGroup.add(projectile);
      }
    });

    // Conclui a conjuração e volta a andar
    this.scene.time.delayedCall(450, () => {
      if (this.active && !this.health.isDead()) {
        this.isCasting = false;
        const walkAnim = this.facing === 'd' ? 'mago_walk_d' : 'mago_walk_e';
        this.play(walkAnim, true);
      }
    });
  }
}
