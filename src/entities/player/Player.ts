import * as Phaser from 'phaser';
import { Entity } from '../Entity';
import { HealthComponent } from '../../components/HealthComponent';
import { MovementComponent } from '../../components/MovementComponent';
import { AttackComponent } from '../../components/AttackComponent';
import { PlayerController } from './PlayerController';
import { CONSTANTS } from '../../core/Constants';
import { GameState, PlayerStats } from '../../core/GameState';
import { EventBus } from '../../core/EventBus';
import { ArrowProjectile } from '../projectiles/ArrowProjectile';
import { AudioService } from '../../systems/AudioService';

export class Player extends Entity {
  public controller: PlayerController;
  public attackComponent!: AttackComponent;
  public stats: PlayerStats;

  public facing: 'd' | 'e' = 'd';
  public isAttackingAnim: boolean = false;
  public isShootingAnim: boolean = false;
  public isDefending: boolean = false;

  private bowCooldownTimer: number = 0;
  private projectileGroup?: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene, x: number, y: number, projectileGroup?: Phaser.GameObjects.Group) {
    super(scene, x, y, 'roberto_d_00');

    this.projectileGroup = projectileGroup;
    this.setDepth(CONSTANTS.DEPTH.CHARACTERS);

    // Ajuste da Hitbox do Roberto no sprite 64x64
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(20, 32);
      body.setOffset(22, 28);
    }

    this.stats = GameState.getComputedPlayerStats();

    // HealthComponent com 10 HP base
    this.health = new HealthComponent(this, this.stats.maxHp, true, CONSTANTS.PLAYER.INVULNERABLE_DURATION);
    this.movement = new MovementComponent(this, this.stats.moveSpeed, CONSTANTS.PLAYER.DASH_SPEED, this.stats.dashCooldown, this.health);
    this.attackComponent = new AttackComponent(this, this.stats.baseDamage, CONSTANTS.PLAYER.ATTACK_COOLDOWN);
    this.controller = new PlayerController(scene);

    this.health.setCallbacks(
      () => this.handleDeath(),
      () => this.syncHealthUI()
    );

    this.syncHealthUI();
  }

  public syncHealthUI() {
    EventBus.emit(CONSTANTS.EVENTS.PLAYER_HEALTH_CHANGED, {
      current: this.health.currentHp,
      max: this.health.maxHp
    });
  }

  public handleDeath() {
    this.setVelocity(0, 0);
    this.play(this.facing === 'd' ? 'roberto_death_d' : 'roberto_death_e', true);
    AudioService.playPlayerHurt();

    EventBus.emit(CONSTANTS.EVENTS.PLAYER_DIED);
  }

  public override update(time: number, delta: number) {
    if (this.health.isDead()) return;

    super.update(time, delta);
    this.attackComponent.update(delta);

    if (this.bowCooldownTimer > 0) {
      this.bowCooldownTimer -= delta;
    }

    // 1. Postura de Defesa com o Escudo
    this.isDefending = this.controller.isDefending();
    if (this.isDefending) {
      this.setVelocity(0, 0);
      this.setTexture(this.facing === 'd' ? 'roberto_d_08' : 'roberto_e_08');
      return;
    }

    // Se estiver em animação de ataque ou tiro, espera concluir
    if (this.isAttackingAnim || this.isShootingAnim) {
      return;
    }

    // 2. Leitura de Movimentação
    const moveInput = this.controller.getMovementVector();
    this.movement.moveInDirection(moveInput.x, moveInput.y);

    if (moveInput.x > 0) this.facing = 'd';
    else if (moveInput.x < 0) this.facing = 'e';

    // 3. Atualizar Animação de Caminhada / Idle
    if (moveInput.x !== 0 || moveInput.y !== 0) {
      const animKey = this.facing === 'd' ? 'roberto_walk_d' : 'roberto_walk_e';
      if (this.anims.currentAnim?.key !== animKey) {
        this.play(animKey, true);
      }
    } else {
      this.stop();
      this.setTexture(this.facing === 'd' ? 'roberto_d_00' : 'roberto_e_00');
    }
  }

  public handleActions(enemyGroup: Phaser.GameObjects.Group, arrowGroup: Phaser.GameObjects.Group) {
    if (this.health.isDead() || this.isDefending) return;

    // 1. Disparo de Besta com Flecha (Clique Esquerdo ou F)
    if (this.controller.isShootCrossbowPressed() && this.bowCooldownTimer <= 0) {
      this.shootArrow(arrowGroup);
      return;
    }

    // 2. Golpe Melee com Espada (Espaço)
    if (this.controller.isMeleeAttackPressed() && this.attackComponent.canAttack) {
      this.meleeAttack(enemyGroup);
    }
  }

  private shootArrow(arrowGroup: Phaser.GameObjects.Group) {
    this.isShootingAnim = true;
    this.bowCooldownTimer = CONSTANTS.PLAYER.BOW_COOLDOWN;
    this.setVelocity(0, 0);

    const pointer = this.scene.input.activePointer;
    const isAimingUp = pointer && pointer.worldY < this.y - 40 && Math.abs(pointer.worldX - this.x) < 50;

    let shootAnim = this.facing === 'd' ? 'roberto_shoot_d' : 'roberto_shoot_e';
    if (isAimingUp) {
      shootAnim = this.facing === 'd' ? 'roberto_shoot_up_d' : 'roberto_shoot_up_e';
    }

    this.play(shootAnim, true);
    AudioService.playAttackSwing();

    // Disparar o projétil da flecha
    const targetX = pointer ? pointer.worldX : (this.facing === 'd' ? this.x + 100 : this.x - 100);
    const targetY = pointer ? pointer.worldY : this.y;

    const arrow = new ArrowProjectile(
      this.scene,
      this.x + (this.facing === 'd' ? 14 : -14),
      this.y - 2,
      targetX,
      targetY,
      this.stats.arrowDamage
    );
    arrowGroup.add(arrow);

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isShootingAnim = false;
    });
  }

  private meleeAttack(enemyGroup: Phaser.GameObjects.Group) {
    this.isAttackingAnim = true;
    this.setVelocity(0, 0);

    const attackAnim = this.facing === 'd' ? 'roberto_attack_d' : 'roberto_attack_e';
    this.play(attackAnim, true);

    const angle = this.facing === 'd' ? 0 : 180;
    this.attackComponent.attack(
      enemyGroup,
      angle,
      this.stats.burnOnAttack,
      (hitEnemy, damage) => {
        const enemyEntity = hitEnemy as unknown as Entity;
        if (enemyEntity.health) {
          enemyEntity.health.takeDamage(damage);
        }
        if (enemyEntity.movement) {
          enemyEntity.movement.applyKnockback(this.x, this.y, 130, 120);
        }
      }
    );

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isAttackingAnim = false;
    });
  }
}
