import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';
import { SlimeEnemy } from './SlimeEnemy';
import { AudioService } from '../../systems/AudioService';
import { RelicChest } from '../items/RelicChest';

export class KingSlimeBoss extends Enemy {
  private slamTimer: number = CONSTANTS.ENEMIES.BOSS.SLAM_COOLDOWN;
  private clawCooldownTimer: number = 0;
  private isSlamming: boolean = false;
  private isClawing: boolean = false;
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
    if (!this.active || this.health.isDead() || !player || !player.active) return;

    // Se estiver no meio do salto aéreo do Slam, aguarda o pouso
    if (this.isSlamming) return;

    if (this.clawCooldownTimer > 0) {
      this.clawCooldownTimer -= delta;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const facingLeft = player.x < this.x;

    // 1. Perseguição constante: a velocidade SEMPRE é atualizada em direção ao jogador
    // Isso garante que o chefe NUNCA trave ou congele, mesmo recebendo golpes de espada/flechas
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setVelocity(
      Math.cos(angle) * this.movement.baseSpeed,
      Math.sin(angle) * this.movement.baseSpeed
    );

    // 2. Ataque visual com as garras ao se aproximar (dist <= 38px)
    if (dist <= 38 && this.clawCooldownTimer <= 0 && !this.isClawing) {
      this.triggerClawAttack(player, facingLeft);
    }

    // 3. Atualiza animação de caminhada se não estiver executando corte
    if (!this.isClawing) {
      this.setFlipX(facingLeft);
      if (this.anims.currentAnim?.key !== 'king_slime_walk') {
        this.play('king_slime_walk', true);
      }
    }

    // 4. Cooldown do Salto Esmagador (Slam)
    this.slamTimer -= delta;
    if (this.slamTimer <= 0) {
      this.slamTimer = CONSTANTS.ENEMIES.BOSS.SLAM_COOLDOWN;
      this.performSlamAttack(player);
    }
  }

  private triggerClawAttack(player: Phaser.GameObjects.Sprite, facingLeft: boolean) {
    this.isClawing = true;
    this.clawCooldownTimer = 1500; // 1.5s entre golpes

    this.setFlipX(false);
    const animKey = facingLeft ? 'king_slime_attack_e' : 'king_slime_attack_d';
    this.play(animKey, true);

    // Ao terminar a animação de ataque, volta à caminhada
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isClawing = false;
      if (this.active && !this.health.isDead()) {
        this.setFlipX(player && player.x < this.x);
        this.play('king_slime_walk', true);
      }
    });

    // Timeout de segurança: garante que a caminhada seja retomada em 500ms
    // mesmo se a animação for interrompida por dano/knockback/flash
    this.scene.time.delayedCall(500, () => {
      if (this.isClawing) {
        this.isClawing = false;
        if (this.active && !this.health.isDead()) {
          this.setFlipX(player && player.x < this.x);
          this.play('king_slime_walk', true);
        }
      }
    });

    // Dano de corte no momento de impacto da garra (~250ms)
    this.scene.time.delayedCall(250, () => {
      if (this.active && !this.health.isDead() && player && player.active) {
        const hitDist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (hitDist <= 42) {
          const playerEntity = player as unknown as { health?: { takeDamage: (dmg: number) => void } };
          playerEntity.health?.takeDamage(CONSTANTS.ENEMIES.BOSS.DAMAGE);
          AudioService.playEnemyHit();
        }
      }
    });
  }

  private performSlamAttack(player: Phaser.GameObjects.Sprite) {
    if (!this.active || !this.scene || this.health.isDead()) return;

    this.isSlamming = true;
    this.isClawing = false;
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
        if (!this.active || !this.scene || this.health.isDead()) {
          telegraph.destroy();
          this.isSlamming = false;
          return;
        }

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

            // 4. Retorna ao tamanho normal e retoma a perseguição
            this.scene.tweens.add({
              targets: this,
              scaleX: 1,
              scaleY: 1,
              duration: 200,
              onComplete: () => {
                this.health.isInvulnerable = false;
                this.isSlamming = false;
                this.clawCooldownTimer = 800;

                if (this.active && !this.health.isDead()) {
                  this.setFlipX(player && player.x < this.x);
                  this.play('king_slime_walk', true);
                }
              }
            });
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
    this.isSlamming = false;
    this.isClawing = false;
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf(this);
    }

    // Ao morrer, gera o Baú de Recompensa Máxima do Chefe
    new RelicChest(this.scene, this.x, this.y);
    super.die();
  }
}
