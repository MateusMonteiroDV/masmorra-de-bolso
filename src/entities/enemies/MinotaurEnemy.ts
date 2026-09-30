import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';
import { AudioService } from '../../systems/AudioService';
import { CoinDrop } from '../items/CoinDrop';
import { ArrowDrop } from '../items/ArrowDrop';
import { EventBus } from '../../core/EventBus';

export class MinotaurEnemy extends Enemy {
  private facing: 'd' | 'e' = 'd';
  private isAttacking: boolean = false;
  private isCharging: boolean = false;
  private isRoaring: boolean = false;
  private isDying: boolean = false;
  private attackCooldownTimer: number = 0;
  private chargeCooldownTimer: number = 2500; // Intervalo antes da primeira investida
  private chargeTargetX: number = 0;
  private chargeTargetY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, dropGroup?: Phaser.GameObjects.Group) {
    super(
      scene,
      x,
      y,
      'minotaur_d_00',
      CONSTANTS.ENEMIES.MINOTAUR.HP,
      CONSTANTS.ENEMIES.MINOTAUR.SPEED,
      CONSTANTS.ENEMIES.MINOTAUR.XP_OR_GOLD,
      dropGroup
    );

    this.contactDamage = CONSTANTS.ENEMIES.MINOTAUR.DAMAGE;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(26, 34);
      body.setOffset(19, 26);
    }

    this.facing = 'd';
    this.play('minotaur_walk_d');
  }

  public override aiBehavior(player: Phaser.GameObjects.Sprite, delta: number) {
    if (!this.active || this.isDying || this.health.isDead() || !player || !player.active) return;

    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }
    if (this.chargeCooldownTimer > 0) {
      this.chargeCooldownTimer -= delta;
    }

    // Se estiver em execução de ataque ou rugido, mantém a ação
    if (this.isAttacking || this.isRoaring) {
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // 1. Executando Investida Furiosa (Charge)
    if (this.isCharging) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.chargeTargetX, this.chargeTargetY);
      this.setVelocity(
        Math.cos(angle) * CONSTANTS.ENEMIES.MINOTAUR.CHARGE_SPEED,
        Math.sin(angle) * CONSTANTS.ENEMIES.MINOTAUR.CHARGE_SPEED
      );

      // Dano de atropelamento se atingir o jogador durante a corrida
      if (dist <= 32) {
        const playerEntity = player as unknown as {
          health?: { takeDamage: (dmg: number) => boolean; isDead: () => boolean };
          isDefending?: boolean;
          movement?: { applyKnockback: (x: number, y: number, f: number, d: number) => void };
        };

        if (playerEntity.isDefending) {
          AudioService.playShieldBlock();
        } else if (playerEntity.health && !playerEntity.health.isDead()) {
          playerEntity.health.takeDamage(this.contactDamage);
          playerEntity.movement?.applyKnockback(this.x, this.y, 220, 180);
          AudioService.playPlayerHurt();
        }
        this.endCharge();
        return;
      }

      // Ao alcançar as proximidades do destino da investida
      const distToTarget = Phaser.Math.Distance.Between(this.x, this.y, this.chargeTargetX, this.chargeTargetY);
      if (distToTarget < 20) {
        this.endCharge();
      }
      return;
    }

    // Atualiza direção para encarar o alvo
    this.facing = player.x < this.x ? 'e' : 'd';
    this.setFlipX(false);

    // 2. Ataque Melee Pesado com Machado (Alcance próximo)
    if (dist <= CONSTANTS.ENEMIES.MINOTAUR.ATTACK_RANGE && this.attackCooldownTimer <= 0) {
      this.performAxeAttack(player);
      return;
    }

    // 3. Iniciar Investida Furiosa a meia distância (75px a 180px)
    if (dist >= 75 && dist <= 180 && this.chargeCooldownTimer <= 0) {
      this.startChargeSequence(player);
      return;
    }

    // 4. Perseguição padrão caminhando com marcha pesada
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setVelocity(
      Math.cos(angle) * this.movement.baseSpeed,
      Math.sin(angle) * this.movement.baseSpeed
    );

    const walkAnim = this.facing === 'd' ? 'minotaur_walk_d' : 'minotaur_walk_e';
    if (this.anims.currentAnim?.key !== walkAnim) {
      this.play(walkAnim, true);
    }
  }

  private performAxeAttack(player: Phaser.GameObjects.Sprite) {
    if (!this.active || this.isDying || this.health.isDead()) return;

    this.isAttacking = true;
    this.setVelocity(0, 0);
    this.attackCooldownTimer = CONSTANTS.ENEMIES.MINOTAUR.ATTACK_COOLDOWN;

    // Inicia golpe de machado (Frames 05 a 09)
    const attackAnim = this.facing === 'd' ? 'minotaur_attack_d' : 'minotaur_attack_e';
    this.play(attackAnim, true);
    AudioService.playAttackSwing();

    // No instante de impacto do machado contra o solo (~260ms)
    this.scene.time.delayedCall(260, () => {
      if (!this.active || this.isDying || this.health.isDead()) {
        this.isAttacking = false;
        return;
      }

      AudioService.playHeavySlam();
      if (this.scene.cameras?.main) {
        this.scene.cameras.main.shake(110, 0.007);
      }

      // Área frontal de alcance do golpe de machado
      if (player && player.active) {
        const hitDist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const inFront = this.facing === 'd' ? player.x >= this.x - 12 : player.x <= this.x + 12;

        if (hitDist <= 48 && inFront) {
          const playerEntity = player as unknown as {
            health?: { takeDamage: (dmg: number) => boolean; isDead: () => boolean };
            isDefending?: boolean;
            movement?: { applyKnockback: (x: number, y: number, f: number, d: number) => void };
          };

          if (playerEntity.isDefending) {
            AudioService.playShieldBlock();
          } else if (playerEntity.health && !playerEntity.health.isDead()) {
            playerEntity.health.takeDamage(this.contactDamage);
            playerEntity.movement?.applyKnockback(this.x, this.y, 180, 160);
          }
        }
      }
    });

    // Finaliza o golpe e retorna à movimentação
    this.scene.time.delayedCall(600, () => {
      if (this.active && !this.isDying && !this.health.isDead()) {
        this.isAttacking = false;
        const walkAnim = this.facing === 'd' ? 'minotaur_walk_d' : 'minotaur_walk_e';
        this.play(walkAnim, true);
      }
    });
  }

  private startChargeSequence(player: Phaser.GameObjects.Sprite) {
    if (!this.active || this.isDying || this.health.isDead()) return;

    this.isRoaring = true;
    this.setVelocity(0, 0);
    this.chargeCooldownTimer = CONSTANTS.ENEMIES.MINOTAUR.CHARGE_COOLDOWN;

    // 1. Rugido de aviso / telégrafo visual (Frames 10 a 12)
    const roarAnim = this.facing === 'd' ? 'minotaur_roar_d' : 'minotaur_roar_e';
    this.play(roarAnim, true);
    AudioService.playMinotaurRoar();

    // Flash avermelhado de fúria
    this.scene.tweens.add({
      targets: this,
      tint: 0xef4444,
      duration: 180,
      yoyo: true,
      onComplete: () => {
        if (this.active) this.clearTint();
      }
    });

    // 2. Dispara a investida após o rugido (~450ms)
    this.scene.time.delayedCall(450, () => {
      if (!this.active || this.isDying || this.health.isDead()) {
        this.isRoaring = false;
        return;
      }

      this.isRoaring = false;
      this.isCharging = true;
      this.chargeTargetX = player.x;
      this.chargeTargetY = player.y;

      const chargeAnim = this.facing === 'd' ? 'minotaur_charge_d' : 'minotaur_charge_e';
      this.play(chargeAnim, true);

      // Trava de segurança para tempo máximo de investida
      this.scene.time.delayedCall(900, () => {
        if (this.isCharging) {
          this.endCharge();
        }
      });
    });
  }

  private endCharge() {
    this.isCharging = false;
    this.setVelocity(0, 0);
    if (this.active && !this.isDying && !this.health.isDead()) {
      const walkAnim = this.facing === 'd' ? 'minotaur_walk_d' : 'minotaur_walk_e';
      this.play(walkAnim, true);
    }
  }

  public override die() {
    if (!this.active || this.isDying) return;
    this.isDying = true;
    this.isAttacking = false;
    this.isCharging = false;
    this.isRoaring = false;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }

    // Dropa as moedas garantidas e a flecha
    if (this.dropGroup) {
      const numCoins = Math.max(1, Math.floor(this.goldReward));
      for (let i = 0; i < numCoins; i++) {
        const offsetX = (Math.random() - 0.5) * 18;
        const offsetY = (Math.random() - 0.5) * 18;
        const coin = new CoinDrop(this.scene, this.x + offsetX, this.y + offsetY, 1);
        this.dropGroup.add(coin);
      }

      const arrow = new ArrowDrop(this.scene, this.x + 8, this.y - 4);
      this.dropGroup.add(arrow);
    }

    EventBus.emit(CONSTANTS.EVENTS.ENEMY_DIED, this);

    // Animação de queda / morte do Minotauro (Frames 15 a 19)
    const deathAnim = this.facing === 'd' ? 'minotaur_death_d' : 'minotaur_death_e';
    this.play(deathAnim, true);

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith('minotaur_death')) {
        // Permanece como carcaça derrotada por 500ms antes de dissipar
        this.scene.time.delayedCall(500, () => {
          if (!this.active) return;
          this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 350,
            onComplete: () => {
              this.destroy();
            }
          });
        });
      }
    });
  }
}
