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
import { NetworkManager } from '../../network/NetworkManager';
import { PlayerNetworkState } from '../../network/NetworkTypes';

export class Player extends Entity {
  public controller: PlayerController;
  public attackComponent!: AttackComponent;
  public stats: PlayerStats;

  public facing: 'd' | 'e' = 'd';
  public isAttackingAnim: boolean = false;
  public isShootingAnim: boolean = false;
  public isDefending: boolean = false;

  private actionLockTimer: number = 0;
  private bowCooldownTimer: number = 0;

  // Seta indicadora visual para o jogador saber quem ele é no mapa
  private indicatorArrow!: Phaser.GameObjects.Graphics;
  private indicatorText?: Phaser.GameObjects.Text;
  private arrowBobOffset: { val: number } = { val: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'roberto_d_00');

    this.setDepth(CONSTANTS.DEPTH.CHARACTERS);
    this.setFlipX(false); // Sempre desativa flipX pois os sprites do artista já têm direções desenhadas

    // Ajuste da Hitbox do Roberto no sprite 64x64
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(20, 32);
      body.setOffset(22, 28);
      body.setCollideWorldBounds(true);
    }

    this.stats = GameState.getComputedPlayerStats();

    this.health = new HealthComponent(this, this.stats.maxHp, true, CONSTANTS.PLAYER.INVULNERABLE_DURATION);
    this.movement = new MovementComponent(this, this.stats.moveSpeed, CONSTANTS.PLAYER.DASH_SPEED, this.stats.dashCooldown, this.health);
    this.attackComponent = new AttackComponent(this, this.stats.baseDamage, CONSTANTS.PLAYER.ATTACK_COOLDOWN);
    this.controller = new PlayerController(scene);

    this.health.setCallbacks(
      () => this.handleDeath(),
      () => this.syncHealthUI()
    );

    // Criação da seta indicadora pixel-art verde neon acima da cabeça do personagem
    this.indicatorArrow = scene.add.graphics();
    this.indicatorArrow.setDepth(CONSTANTS.DEPTH.UI + 5);
    this.drawIndicatorArrow();

    this.indicatorText = scene.add.text(x, y - 44, 'VOCÊ', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#4ade80',
      stroke: '#052e16',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI + 5);

    scene.tweens.add({
      targets: this.arrowBobOffset,
      val: -5,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.syncHealthUI();
  }

  private drawIndicatorArrow() {
    this.indicatorArrow.clear();
    // Contorno escuro sólido
    this.indicatorArrow.fillStyle(0x052e16, 1);
    this.indicatorArrow.fillTriangle(-6, -10, 6, -10, 0, 1);
    // Corpo verde neon vibrante
    this.indicatorArrow.fillStyle(0x22c55e, 1);
    this.indicatorArrow.fillTriangle(-5, -9, 5, -9, 0, 0);
    // Detalhe brilhante interno
    this.indicatorArrow.fillStyle(0xdcfce7, 1);
    this.indicatorArrow.fillTriangle(-2, -8, 2, -8, 0, -3);
  }

  public syncHealthUI() {
    EventBus.emit(CONSTANTS.EVENTS.PLAYER_HEALTH_CHANGED, {
      current: this.health.currentHp,
      max: this.health.maxHp
    });
  }

  public handleDeath() {
    this.setVelocity(0, 0);
    this.setFlipX(false);
    this.play(this.facing === 'd' ? 'roberto_death_d' : 'roberto_death_e', true);
    AudioService.playPlayerHurt();

    if (this.indicatorArrow) this.indicatorArrow.setVisible(false);
    if (this.indicatorText) this.indicatorText.setVisible(false);

    EventBus.emit(CONSTANTS.EVENTS.PLAYER_DIED);
  }

  public override update(time: number, delta: number) {
    if (this.health.isDead()) {
      if (this.indicatorArrow) this.indicatorArrow.setVisible(false);
      if (this.indicatorText) this.indicatorText.setVisible(false);
      return;
    }

    super.update(time, delta);

    // Atualiza a posição da seta indicadora (VOCÊ) logo acima da cabeça do Roberto
    if (this.indicatorArrow && this.indicatorArrow.active) {
      this.indicatorArrow.setVisible(true);
      this.indicatorArrow.setPosition(this.x, this.y - 34 + this.arrowBobOffset.val);
      if (this.indicatorText && this.indicatorText.active) {
        this.indicatorText.setVisible(true);
        this.indicatorText.setPosition(this.x, this.y - 44 + this.arrowBobOffset.val);
      }
    }

    this.attackComponent.update(delta);

    if (this.bowCooldownTimer > 0) {
      this.bowCooldownTimer -= delta;
    }

    // Trava temporária durante golpe ou disparo
    if (this.actionLockTimer > 0) {
      this.actionLockTimer -= delta;
      if (this.actionLockTimer <= 0) {
        this.isAttackingAnim = false;
        this.isShootingAnim = false;
      }
      return;
    }

    // 1. Postura de Defesa com o Escudo
    this.isDefending = this.controller.isDefending();
    if (this.isDefending) {
      // Permite movimentação tática lenta com escudo levantado
      const moveInput = this.controller.getMovementVector();
      if (moveInput.x !== 0 || moveInput.y !== 0) {
        this.movement.moveInDirection(moveInput.x * 0.45, moveInput.y * 0.45);
        if (moveInput.x < 0) this.facing = 'e';
        else if (moveInput.x > 0) this.facing = 'd';
      } else {
        this.setVelocity(0, 0);
      }
      this.setFlipX(false);
      this.setTexture(this.facing === 'd' ? 'roberto_d_08' : 'roberto_e_08');
      this.showShieldAura();
      return;
    } else {
      this.hideShieldAura();
    }

    // 2. Leitura de Movimentação
    const moveInput = this.controller.getMovementVector();
    this.movement.moveInDirection(moveInput.x, moveInput.y);

    // Ajuste explícito de direção (Esquerda vs Direita)
    if (moveInput.x < 0) {
      this.facing = 'e';
    } else if (moveInput.x > 0) {
      this.facing = 'd';
    }

    this.setFlipX(false);

    // 3. Atualizar Animação de Caminhada / Espera
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

  private shieldAuraGraphics?: Phaser.GameObjects.Graphics;

  private showShieldAura() {
    if (!this.shieldAuraGraphics) {
      this.shieldAuraGraphics = this.scene.add.graphics();
      this.shieldAuraGraphics.setDepth(CONSTANTS.DEPTH.CHARACTERS + 2);
    }
    this.shieldAuraGraphics.clear();
    this.shieldAuraGraphics.setVisible(true);

    const shieldX = this.x + (this.facing === 'd' ? 12 : -12);
    const shieldY = this.y + 4;

    this.shieldAuraGraphics.lineStyle(2, 0x38bdf8, 0.85);
    this.shieldAuraGraphics.fillStyle(0x0284c7, 0.35);
    this.shieldAuraGraphics.strokeCircle(shieldX, shieldY, 13);
    this.shieldAuraGraphics.fillCircle(shieldX, shieldY, 13);
  }

  private hideShieldAura() {
    if (this.shieldAuraGraphics) {
      this.shieldAuraGraphics.setVisible(false);
    }
  }

  public handleActions(enemyGroup: Phaser.GameObjects.Group, arrowGroup: Phaser.GameObjects.Group) {
    if (this.health.isDead()) return;

    // 1. Esquiva / Dash ("Esquivar" com Shift ou C)
    if (this.controller.isDashPressed() && this.movement.canDash && !this.movement.isDashing) {
      this.performDash();
      return;
    }

    if (this.isDefending || this.actionLockTimer > 0) return;

    // 2. Disparo de Besta com Flecha (Clique Esquerdo, F ou J)
    if (this.controller.isShootCrossbowPressed() && this.bowCooldownTimer <= 0) {
      if (this.scene.scene.key === 'DungeonScene' && GameState.arrows <= 0) {
        this.showNoArrowsPopup();
        return;
      }
      this.shootArrow(arrowGroup);
      return;
    }

    // 3. Golpe Melee com Espada (Espaço ou K)
    if (this.controller.isMeleeAttackPressed() && this.attackComponent.canAttack) {
      this.meleeAttack(enemyGroup);
    }
  }

  public performDash() {
    const moveInput = this.controller.getMovementVector();
    let dx = moveInput.x;
    let dy = moveInput.y;

    // Se estiver parado, esquiva para a direção que está olhando
    if (dx === 0 && dy === 0) {
      dx = this.facing === 'd' ? 1 : -1;
      dy = 0;
    } else {
      if (dx < 0) this.facing = 'e';
      else if (dx > 0) this.facing = 'd';
    }

    this.isDefending = false;
    this.hideShieldAura();

    const success = this.movement.dash(dx, dy);
    if (success && NetworkManager.isConnected()) {
      NetworkManager.sendAction({
        type: 'player_dash',
        payload: { dirX: dx, dirY: dy, x: this.x, y: this.y }
      });
    }
  }

  private showNoArrowsPopup() {
    this.bowCooldownTimer = 350;
    AudioService.playAttackSwing();
    const popup = this.scene.add.text(this.x, this.y - 28, 'SEM FLECHAS!', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#ef4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);

    this.scene.tweens.add({
      targets: popup,
      y: this.y - 40,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => popup.destroy()
    });
  }

  private shootArrow(arrowGroup: Phaser.GameObjects.Group) {
    // Consome flecha apenas durante a incursão na masmorra
    if (this.scene.scene.key === 'DungeonScene') {
      GameState.useArrow();
    }

    this.isShootingAnim = true;
    this.actionLockTimer = 200; // 200ms de animação de disparo
    this.bowCooldownTimer = CONSTANTS.PLAYER.BOW_COOLDOWN;
    this.setVelocity(0, 0);

    const pointer = this.scene.input.activePointer;
    const screenPos = this.controller.lastMouseShootScreenPos || (pointer ? { x: pointer.x, y: pointer.y } : null);
    this.controller.lastMouseShootScreenPos = null;

    let targetX = this.facing === 'd' ? this.x + 180 : this.x - 180;
    let targetY = this.y;

    const isMouse = this.controller.wasMouseShoot && screenPos !== null;

    if (isMouse && screenPos) {
      const worldPoint = this.scene.cameras.main.getWorldPoint(screenPos.x, screenPos.y);
      targetX = worldPoint.x;
      targetY = worldPoint.y;

      // Ajusta a direção da mira se foi disparado pelo clique do mouse
      if (targetX < this.x - 5) {
        this.facing = 'e';
      } else if (targetX > this.x + 5) {
        this.facing = 'd';
      }
    } else {
      // Disparo via teclado (F ou J): considera movimento atual se houver
      const moveInput = this.controller.getMovementVector();
      if (moveInput.x !== 0 || moveInput.y !== 0) {
        targetX = this.x + moveInput.x * 180;
        targetY = this.y + moveInput.y * 180;
      }
    }

    this.setFlipX(false);

    const isAimingUp = isMouse && targetY < this.y - 35 && Math.abs(targetX - this.x) < 40;

    let shootAnim = this.facing === 'd' ? 'roberto_shoot_d' : 'roberto_shoot_e';
    if (isAimingUp) {
      shootAnim = this.facing === 'd' ? 'roberto_shoot_up_d' : 'roberto_shoot_up_e';
    }

    this.play(shootAnim, true);
    AudioService.playAttackSwing();

    const arrowX = isAimingUp ? this.x : (this.facing === 'd' ? this.x + 14 : this.x - 14);
    const arrowY = isAimingUp ? this.y - 14 : this.y - 2;

    const arrow = new ArrowProjectile(
      this.scene,
      arrowX,
      arrowY,
      targetX,
      targetY,
      this.stats.arrowDamage
    );
    arrowGroup.add(arrow);

    // Transmite o disparo para outros jogadores conectados via P2P
    NetworkManager.sendAction({
      type: 'shoot_arrow',
      payload: { targetX, targetY }
    });
  }

  private meleeAttack(enemyGroup: Phaser.GameObjects.Group) {
    this.isAttackingAnim = true;
    this.actionLockTimer = 250;
    this.setVelocity(0, 0);
    this.setFlipX(false);

    // Determina a direção do golpe (suporta Mouse, Movimento WASD e Direção Atual)
    let attackAngle = this.facing === 'd' ? 0 : 180;

    const pointer = this.scene.input.activePointer;
    const moveInput = this.controller.getMovementVector();

    if (pointer && this.scene.cameras?.main) {
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const distToPointer = Phaser.Math.Distance.Between(this.x, this.y, worldPoint.x, worldPoint.y);
      if (distToPointer > 14) {
        const rad = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
        attackAngle = Phaser.Math.RadToDeg(rad);

        if (worldPoint.x < this.x - 4) {
          this.facing = 'e';
        } else if (worldPoint.x > this.x + 4) {
          this.facing = 'd';
        }
      } else if (moveInput.x !== 0 || moveInput.y !== 0) {
        attackAngle = Phaser.Math.RadToDeg(Math.atan2(moveInput.y, moveInput.x));
        if (moveInput.x < 0) this.facing = 'e';
        else if (moveInput.x > 0) this.facing = 'd';
      }
    } else if (moveInput.x !== 0 || moveInput.y !== 0) {
      attackAngle = Phaser.Math.RadToDeg(Math.atan2(moveInput.y, moveInput.x));
      if (moveInput.x < 0) this.facing = 'e';
      else if (moveInput.x > 0) this.facing = 'd';
    }

    const attackAnim = this.facing === 'd' ? 'roberto_attack_d' : 'roberto_attack_e';
    this.play(attackAnim, true);

    this.attackComponent.attack(
      enemyGroup,
      attackAngle,
      this.stats.burnOnAttack,
      (hitEnemy, damage) => {
        const enemyEntity = hitEnemy as unknown as Entity;
        if (enemyEntity.health) {
          enemyEntity.health.takeDamage(damage);
        }
        if (enemyEntity.movement) {
          enemyEntity.movement.applyKnockback(this.x, this.y, 140, 130);
        }

        const enemyId = (hitEnemy as any).getData?.('networkId');
        if (enemyId && NetworkManager.isConnected()) {
          NetworkManager.sendAction({
            type: 'enemy_hit',
            payload: {
              enemyId,
              damage,
              sourceX: this.x,
              sourceY: this.y
            }
          });
        }
      }
    );

    // Transmite o golpe melee para outros jogadores conectados via P2P
    NetworkManager.sendAction({
      type: 'melee_attack',
      payload: { facing: this.facing }
    });
  }

  public getNetworkState(sceneKey?: string): PlayerNetworkState {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return {
      x: this.x,
      y: this.y,
      vx: body ? body.velocity.x : 0,
      vy: body ? body.velocity.y : 0,
      facing: this.facing,
      anim: this.anims.currentAnim?.key || '',
      isAttacking: this.isAttackingAnim,
      isShooting: this.isShootingAnim,
      isDefending: this.isDefending,
      currentHp: this.health.currentHp,
      maxHp: this.health.maxHp,
      scene: sceneKey || this.scene.scene.key
    };
  }

  public override destroy(fromScene?: boolean) {
    if (this.controller) {
      this.controller.destroy();
    }
    if (this.indicatorArrow) {
      this.indicatorArrow.destroy();
    }
    if (this.indicatorText) {
      this.indicatorText.destroy();
    }
    if (this.shieldAuraGraphics) {
      this.shieldAuraGraphics.destroy();
    }
    super.destroy(fromScene);
  }
}
