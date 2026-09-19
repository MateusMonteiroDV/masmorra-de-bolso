import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';
import { Enemy } from '../enemies/Enemy';

export class ArrowProjectile extends Phaser.Physics.Arcade.Sprite {
  public damage: number;
  private lifeTime: number = 2200;
  private knockbackForce: number = CONSTANTS.PLAYER.ARROW_KNOCKBACK;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage: number = CONSTANTS.PLAYER.ARROW_DAMAGE
  ) {
    // Carrega a textura da flecha
    super(scene, x, y, 'arrow_sprite');
    this.damage = damage;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.PROJECTILES);

    // Calcular ângulo até o alvo
    const angleRad = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const speed = CONSTANTS.PLAYER.ARROW_SPEED;

    this.setVelocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    // Como flexaaa4 aponta para a direita, alinhamos a rotação com o ângulo
    this.setRotation(angleRad);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(16, 8);
      body.setOffset(8, 12);
    }
  }

  public onHitEnemy(enemy: Enemy) {
    if (!this.active || !enemy.active || enemy.health.isDead()) return;

    // 1. Aplica o dano no monstro
    enemy.health.takeDamage(this.damage);

    // 2. Empurra o monstro um pouco para trás (Knockback solicitado)
    if (enemy.movement) {
      enemy.movement.applyKnockback(this.x, this.y, this.knockbackForce, 140);
    }

    // 3. Efeito visual de nuvem de impacto (nuvem-monstro)
    const cloud = this.scene.add.sprite(this.x, this.y, 'nuvem_impacto');
    cloud.setDepth(CONSTANTS.DEPTH.EFFECTS);
    cloud.setScale(0.8);
    cloud.play('anim_nuvem');
    cloud.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      cloud.destroy();
    });

    // 4. Destrói o projétil da flecha
    this.destroy();
  }

  public override update(time: number, delta: number) {
    super.update(time, delta);
    this.lifeTime -= delta;
    if (this.lifeTime <= 0) {
      this.destroy();
    }
  }
}
