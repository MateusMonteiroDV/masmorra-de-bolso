import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';
import { CoinDrop } from '../items/CoinDrop';
import { ArrowDrop } from '../items/ArrowDrop';
import { EventBus } from '../../core/EventBus';

export class SlimeEnemy extends Enemy {
  private hopTimer: number = 0;
  private isAttacking: boolean = false;
  private isDying: boolean = false;
  private attackCooldownTimer: number = 0;
  private facing: 'd' | 'e' = 'd';

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

    this.facing = 'd';
    this.play('slime_walk_d');
  }

  public override aiBehavior(player: Phaser.GameObjects.Sprite, delta: number) {
    if (!this.active || this.isDying || this.health.isDead()) return;

    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }

    // Se estiver no meio do ataque, mantém a investida
    if (this.isAttacking) return;

    // Atualiza direção
    this.facing = player.x < this.x ? 'e' : 'd';

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // 1. ATAQUE: Só é executado se estiver perto do personagem (dist <= 36px) e com cooldown pronto
    if (dist <= 36 && this.attackCooldownTimer <= 0) {
      this.performAttack(player);
      return;
    }

    // 2. CAMINHADA: Perseguição suave com pulos
    this.hopTimer += delta;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.movement.baseSpeed * (0.8 + Math.sin(this.hopTimer * 0.008) * 0.35);

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const walkAnim = this.facing === 'e' ? 'slime_walk_e' : 'slime_walk_d';
    if (this.anims.currentAnim?.key !== walkAnim) {
      this.play(walkAnim, true);
    }
  }

  private performAttack(player: Phaser.GameObjects.Sprite) {
    this.isAttacking = true;
    this.attackCooldownTimer = 1300; // 1.3s entre ataques

    // Pequeno pulo/investida frontal em direção ao jogador
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const lungeSpeed = this.movement.baseSpeed * 1.35;
    this.setVelocity(Math.cos(angle) * lungeSpeed, Math.sin(angle) * lungeSpeed);

    const attackAnim = this.facing === 'e' ? 'slime_attack_e' : 'slime_attack_d';
    this.play(attackAnim, true);

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith('slime_attack')) {
        this.isAttacking = false;
        if (!this.isDying && this.active && !this.health.isDead()) {
          const walkAnim = this.facing === 'e' ? 'slime_walk_e' : 'slime_walk_d';
          this.play(walkAnim, true);
        }
      }
    });
  }

  public override die() {
    if (!this.active || this.isDying) return;
    this.isDying = true;
    this.isAttacking = false;

    // Desativa colisão física para não causar dano enquanto toca animação de morte
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }

    // Dropa as moedas e flechas da vitória
    if (this.dropGroup) {
      // Slimes comuns têm 50% de chance de dropar 1 moeda de ouro
      if (Math.random() < 0.5) {
        const coin = new CoinDrop(this.scene, this.x, this.y, 1);
        this.dropGroup.add(coin);
      }

      const arrow = new ArrowDrop(this.scene, this.x + 6, this.y - 4);
      this.dropGroup.add(arrow);
    }

    EventBus.emit(CONSTANTS.EVENTS.ENEMY_DIED, this);

    // Executa a animação de morte do slime (frames 10 a 14)
    const deathAnim = this.facing === 'e' ? 'slime_death_e' : 'slime_death_d';
    this.play(deathAnim, true);

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith('slime_death')) {
        // Permanece como poça esmagada por 250ms antes de dissipar
        this.scene.time.delayedCall(250, () => {
          if (!this.active) return;
          this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              this.destroy();
            }
          });
        });
      }
    });
  }
}
