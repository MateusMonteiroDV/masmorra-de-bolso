import * as Phaser from 'phaser';
import { Enemy } from './Enemy';
import { CONSTANTS } from '../../core/Constants';
import { EventBus } from '../../core/EventBus';
import { AudioService } from '../../systems/AudioService';
import { MagicProjectile } from '../projectiles/MagicProjectile';

type CapetaoFacing = 'd' | 'e';

/**
 * Capetão: chefe final da Sala do Capetão (após as 8 ondas).
 *
 * Padrões de ataque:
 * - Garra: golpe corpo a corpo quando o alvo encosta.
 * - Bafo de fogo: leque de bolas de fogo a média distância (telegrafado com a boca aberta).
 * - Fase 2 (abaixo de 50% de vida): fica mais rápido e solta um anel de fogo periódico.
 */
export class CapetaoBoss extends Enemy {
  private facing: CapetaoFacing = 'd';
  private projectileGroup?: Phaser.GameObjects.Group;
  private isBusy: boolean = false;
  private isDying: boolean = false;
  private isEnraged: boolean = false;
  private clawCooldownTimer: number = 1200;
  private fireCooldownTimer: number = 2200;
  private ringCooldownTimer: number = CONSTANTS.ENEMIES.CAPETAO.RING_COOLDOWN;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dropGroup?: Phaser.GameObjects.Group,
    projectileGroup?: Phaser.GameObjects.Group,
    extraPlayers: number = 0
  ) {
    const stats = CONSTANTS.ENEMIES.CAPETAO;
    const maxHp = Math.round(stats.HP * (1 + Math.max(0, extraPlayers) * stats.HP_PER_EXTRA_PLAYER));
    super(scene, x, y, 'capetao_10', maxHp, stats.SPEED, stats.XP_OR_GOLD, dropGroup);

    this.projectileGroup = projectileGroup;
    this.contactDamage = stats.CONTACT_DAMAGE;
    this.setScale(stats.SCALE);
    this.movement.knockbackImmune = true;

    // O corpo físico é definido em pixels do frame (64x64) e escalado junto com o sprite
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(24, 30);
      body.setOffset(20, 28);
      body.setImmovable(true);
    }

    this.play('capetao_walk_d');
    this.emitHealth();

    this.health.setCallbacks(
      () => this.die(),
      () => this.onDamaged()
    );
  }

  public override applyDifficultyScale() {
    // O Capetão tem atributos próprios; a escala das ondas não se aplica.
  }

  private emitHealth() {
    EventBus.emit(CONSTANTS.EVENTS.BOSS_HEALTH_CHANGED, {
      name: 'CAPETÃO',
      current: this.health.currentHp,
      max: this.health.maxHp
    });
  }

  private onDamaged() {
    this.emitHealth();
    if (!this.isEnraged && this.health.currentHp <= this.health.maxHp / 2) {
      this.enterEnragedPhase();
    }
  }

  private enterEnragedPhase() {
    this.isEnraged = true;
    this.movement.baseSpeed = CONSTANTS.ENEMIES.CAPETAO.ENRAGED_SPEED;
    this.ringCooldownTimer = 1500;
    this.scene.cameras.main.shake(250, 0.01);
    AudioService.playMinotaurRoar();

    const warning = this.scene.add.text(this.x, this.y - 70, 'O CAPETÃO ESTÁ FURIOSO!', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#f97316',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
    this.scene.tweens.add({
      targets: warning,
      y: warning.y - 20,
      alpha: 0,
      duration: 1600,
      onComplete: () => warning.destroy()
    });
  }

  public override aiBehavior(player: Phaser.GameObjects.Sprite, delta: number) {
    if (!this.active || this.isDying || this.health.isDead() || !player || !player.active) return;

    this.clawCooldownTimer -= delta;
    this.fireCooldownTimer -= delta;
    if (this.isEnraged) this.ringCooldownTimer -= delta;

    if (this.isBusy) return;

    this.facing = player.x < this.x ? 'e' : 'd';
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const stats = CONSTANTS.ENEMIES.CAPETAO;

    if (this.isEnraged && this.ringCooldownTimer <= 0) {
      this.ringCooldownTimer = stats.RING_COOLDOWN;
      this.performFireRing();
      return;
    }

    if (distance <= stats.CLAW_RANGE && this.clawCooldownTimer <= 0) {
      this.clawCooldownTimer = stats.CLAW_COOLDOWN;
      this.performClaw(player);
      return;
    }

    if (distance > stats.CLAW_RANGE && distance <= stats.FIRE_RANGE && this.fireCooldownTimer <= 0) {
      this.fireCooldownTimer = stats.FIRE_COOLDOWN * (this.isEnraged ? 0.75 : 1);
      this.performFireBreath(player);
      return;
    }

    // Perseguição: para um pouco antes de encostar para não "empurrar" o herói
    if (distance > stats.CLAW_RANGE * 0.7) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(Math.cos(angle) * this.movement.baseSpeed, Math.sin(angle) * this.movement.baseSpeed);
    } else {
      this.setVelocity(0, 0);
    }
    this.playLoop(`capetao_walk_${this.facing}`);
  }

  private playLoop(animationKey: string) {
    if (this.anims.currentAnim?.key !== animationKey) {
      this.play(animationKey, true);
    }
  }

  private performClaw(player: Phaser.GameObjects.Sprite) {
    this.isBusy = true;
    this.setVelocity(0, 0);
    this.play(`capetao_claw_${this.facing}`, true);
    AudioService.playAttackSwing();

    this.scene.time.delayedCall(260, () => {
      if (!this.isAlive() || !player.active) return;
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const inFront = this.facing === 'd' ? player.x >= this.x - 16 : player.x <= this.x + 16;
      if (distance <= CONSTANTS.ENEMIES.CAPETAO.CLAW_RANGE + 8 && inFront) {
        this.hitTarget(player, CONSTANTS.ENEMIES.CAPETAO.CLAW_DAMAGE, 200);
      }
    });

    this.scene.time.delayedCall(520, () => this.finishAction());
  }

  private performFireBreath(player: Phaser.GameObjects.Sprite) {
    this.isBusy = true;
    this.setVelocity(0, 0);
    this.play(`capetao_breath_${this.facing}`, true);
    AudioService.playMagicCast();

    // A boca abre primeiro (telégrafo); o fogo sai no último quadro da animação
    this.scene.time.delayedCall(420, () => {
      if (!this.isAlive()) return;
      const mouthX = this.x + (this.facing === 'd' ? 30 : -30);
      const mouthY = this.y - 26;
      const baseAngle = Phaser.Math.Angle.Between(mouthX, mouthY, player.x, player.y);
      const spreadCount = this.isEnraged ? 5 : 3;
      const spreadStep = Phaser.Math.DegToRad(14);
      for (let index = 0; index < spreadCount; index++) {
        const angle = baseAngle + (index - (spreadCount - 1) / 2) * spreadStep;
        this.spawnFireball(mouthX, mouthY, angle);
      }
    });

    this.scene.time.delayedCall(760, () => this.finishAction());
  }

  private performFireRing() {
    this.isBusy = true;
    this.setVelocity(0, 0);
    this.play(`capetao_breath_${this.facing}`, true);

    // Telégrafo: círculo pulsante antes da explosão de fogo
    const telegraph = this.scene.add.graphics().setDepth(CONSTANTS.DEPTH.DECORATION);
    telegraph.lineStyle(2, 0xf97316, 0.9);
    telegraph.strokeCircle(this.x, this.y, 46);
    this.scene.tweens.add({ targets: telegraph, alpha: 0.2, duration: 150, yoyo: true, repeat: 2 });

    this.scene.time.delayedCall(650, () => {
      telegraph.destroy();
      if (!this.isAlive()) return;
      this.scene.cameras.main.shake(140, 0.008);
      AudioService.playHeavySlam();
      const projectileCount = 12;
      for (let index = 0; index < projectileCount; index++) {
        this.spawnFireball(this.x, this.y - 10, (Math.PI * 2 * index) / projectileCount);
      }
    });

    this.scene.time.delayedCall(950, () => this.finishAction());
  }

  private spawnFireball(fromX: number, fromY: number, angle: number) {
    const distance = 300;
    const projectile = new MagicProjectile(
      this.scene,
      fromX,
      fromY,
      fromX + Math.cos(angle) * distance,
      fromY + Math.sin(angle) * distance,
      CONSTANTS.ENEMIES.CAPETAO.FIRE_PROJECTILE_SPEED,
      CONSTANTS.ENEMIES.CAPETAO.FIRE_DAMAGE
    );
    projectile.setTint(0xff7a1a);
    this.projectileGroup?.add(projectile);
  }

  private hitTarget(target: Phaser.GameObjects.Sprite, damage: number, knockbackForce: number) {
    const targetEntity = target as unknown as {
      health?: { takeDamage: (dmg: number) => boolean; isDead: () => boolean };
      isDefending?: boolean;
      movement?: { applyKnockback: (x: number, y: number, force: number, duration: number) => void };
    };
    if (targetEntity.isDefending) {
      AudioService.playShieldBlock();
      return;
    }
    if (!targetEntity.health || targetEntity.health.isDead()) return;
    const took = targetEntity.health.takeDamage(damage);
    if (took && !targetEntity.health.isDead()) {
      targetEntity.movement?.applyKnockback(this.x, this.y, knockbackForce, 160);
    }
  }

  private finishAction() {
    this.isBusy = false;
    if (this.isAlive()) {
      this.play(`capetao_walk_${this.facing}`, true);
    }
  }

  private isAlive(): boolean {
    return this.active && !this.isDying && !this.health.isDead();
  }

  public override die() {
    if (!this.active || this.isDying) return;
    this.isDying = true;
    this.isBusy = true;
    this.emitHealth();

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }

    this.spawnDrops();
    EventBus.emit(CONSTANTS.EVENTS.ENEMY_DIED, this);

    this.scene.cameras.main.shake(400, 0.012);
    this.play(`capetao_death_${this.facing}`, true);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.active) return;
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        delay: 1200,
        duration: 600,
        onComplete: () => this.destroy()
      });
    });
  }
}
