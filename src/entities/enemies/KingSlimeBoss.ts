import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';
import { ASSET_KEYS } from '../../assets/AssetManifest';
import { SlimeEnemy } from './SlimeEnemy';
import { AudioService } from '../../systems/AudioService';
import { RelicChest } from '../items/RelicChest';

export class KingSlimeBoss extends Enemy {
  private slamTimer: number = CONSTANTS.ENEMIES.BOSS.SLAM_COOLDOWN;
  private attackCooldownTimer: number = 0;
  private isSlamming: boolean = false;
  private isAttacking: boolean = false;
  private facing: 'd' | 'e' = 'd';
  private enemyGroup?: Phaser.GameObjects.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dropGroup?: Phaser.GameObjects.Group,
    enemyGroup?: Phaser.GameObjects.Group
  ) {
    super(
      scene,
      x,
      y,
      'king_slime_00',
      CONSTANTS.ENEMIES.BOSS.HP,
      CONSTANTS.ENEMIES.BOSS.SPEED,
      CONSTANTS.ENEMIES.BOSS.XP_OR_GOLD,
      dropGroup
    );

    this.enemyGroup = enemyGroup;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(26, 20);
      body.setOffset(3, 8);
    }

    this.play('king_slime_walk');
  }

  public override aiBehavior(player: Phaser.GameObjects.Sprite, delta: number) {
    if (!this.active || this.health.isDead() || this.isSlamming || !player || !player.active) return;

    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }

    if (this.isAttacking) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (player.x < this.x) {
      this.facing = 'e';
    } else {
      this.facing = 'd';
    }

    // 1. Ataque de garra corpo a corpo se estiver no alcance (dist <= 40px)
    if (dist <= 40 && this.attackCooldownTimer <= 0) {
      this.performMeleeAttack(player);
      return;
    }

    // 2. Perseguição padrão com caminhada/rastejo
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setVelocity(
      Math.cos(angle) * this.movement.baseSpeed,
      Math.sin(angle) * this.movement.baseSpeed
    );

    this.setFlipX(this.facing === 'e');

    if (this.anims.currentAnim?.key !== 'king_slime_walk') {
      this.play('king_slime_walk', true);
    }

    // 3. Cooldown do Salto Esmagador (Slam)
    this.slamTimer -= delta;
    if (this.slamTimer <= 0) {
      this.slamTimer = CONSTANTS.ENEMIES.BOSS.SLAM_COOLDOWN;
      this.performSlamAttack(player);
    }
  }

  private performMeleeAttack(player: Phaser.GameObjects.Sprite) {
    this.isAttacking = true;
    this.attackCooldownTimer = 1600; // 1.6s entre golpes de garra

    // Pequeno avanço em direção ao jogador
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const lungeSpeed = this.movement.baseSpeed * 1.35;
    this.setVelocity(Math.cos(angle) * lungeSpeed, Math.sin(angle) * lungeSpeed);

    // Os sprites de ataque possuem garras desenhadas: 04-07 para esquerda e 08-11 para direita
    this.setFlipX(false);
    const attackAnim = this.facing === 'e' ? 'king_slime_attack_e' : 'king_slime_attack_d';
    this.play(attackAnim, true);

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith('king_slime_attack')) {
        this.isAttacking = false;
        if (this.active && !this.health.isDead()) {
          // Aplica dano da garra se o jogador estiver no raio do corte
          if (player && player.active) {
            const hitDist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (hitDist <= 44) {
              const playerEntity = player as unknown as { health?: { takeDamage: (dmg: number) => void } };
              playerEntity.health?.takeDamage(CONSTANTS.ENEMIES.BOSS.DAMAGE);
              AudioService.playEnemyHit();
            }
          }
          this.setFlipX(this.facing === 'e');
          this.play('king_slime_walk', true);
        }
      }
    });
  }

  private performSlamAttack(player: Phaser.GameObjects.Sprite) {
    this.isSlamming = true;
    this.setVelocity(0, 0);

    const targetX = player.x;
    const targetY = player.y;

    // 1. Zona de impacto vermelha pulsante no chão (Telégrafo visual para o jogador dar Dash)
    const telegraph = this.scene.add.graphics();
    telegraph.lineStyle(2, 0xef4444, 0.8);
    telegraph.fillStyle(0xef4444, 0.25);
    telegraph.strokeCircle(targetX, targetY, 32);
    telegraph.fillCircle(targetX, targetY, 32);
    telegraph.setDepth(CONSTANTS.DEPTH.DECORATION);

    // 2. O Chefe pula alto no ar (escala aumenta e fica invulnerável)
    this.health.isInvulnerable = true;
    this.scene.tweens.add({
      targets: this,
      y: this.y - 45,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // 3. Esmaga na área marcada com velocidade
        this.scene.tweens.add({
          targets: this,
          x: targetX,
          y: targetY,
          scaleX: 1.1,
          scaleY: 0.7, // Esmagado no chão
          duration: 250,
          ease: 'Quad.easeIn',
          onComplete: () => {
            telegraph.destroy();
            this.health.isInvulnerable = false;
            this.isSlamming = false;

            // Retorna ao tamanho normal e retoma a animação de caminhada
            this.scene.tweens.add({
              targets: this,
              scaleX: 1,
              scaleY: 1,
              duration: 200,
              onComplete: () => {
                if (this.active && !this.health.isDead()) {
                  this.setFlipX(this.facing === 'e');
                  this.play('king_slime_walk', true);
                }
              }
            });

            // Tremor de tela e som de impacto
            this.scene.cameras.main.shake(180, 0.015);
            AudioService.playEnemyHit();

            // Causa dano em área no jogador se não tiver esquivado
            if (player && player.active) {
              const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
              if (dist < 34) {
                const playerEntity = player as unknown as { health?: { takeDamage: (dmg: number) => void } };
                playerEntity.health?.takeDamage(CONSTANTS.ENEMIES.BOSS.SLAM_DAMAGE);
              }
            }

            // Invocação de 1 a 2 slimes menores
            this.spawnMinions();
          }
        });
      }
    });
  }

  private spawnMinions() {
    if (!this.enemyGroup || this.enemyGroup.getLength() > 5) return;

    for (let i = 0; i < 2; i++) {
      const offsetX = (i === 0 ? -24 : 24);
      const slime = new SlimeEnemy(this.scene, this.x + offsetX, this.y + 10, this.dropGroup);
      slime.setData('isMinion', true);
      this.enemyGroup.add(slime);
    }
  }

  public override die() {
    // Ao morrer, gera o Baú de Recompensa Máxima do Chefe
    new RelicChest(this.scene, this.x, this.y);
    super.die();
  }
}
