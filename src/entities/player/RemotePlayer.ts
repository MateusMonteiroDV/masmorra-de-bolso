import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';
import { PlayerNetworkState } from '../../network/NetworkTypes';
import { ArrowProjectile } from '../projectiles/ArrowProjectile';
import { AudioService } from '../../systems/AudioService';
import { Entity } from '../Entity';

export class RemotePlayer extends Phaser.Physics.Arcade.Sprite {
  public peerId: string;
  public facing: 'd' | 'e' = 'd';
  public isAttacking: boolean = false;
  public isShooting: boolean = false;
  public isDefending: boolean = false;

  private targetX: number;
  private targetY: number;
  private nameTag: Phaser.GameObjects.Text;
  private hpBar?: Phaser.GameObjects.Graphics;
  private currentHp: number = 6;
  private maxHp: number = 6;

  public isDead(): boolean {
    return this.currentHp <= 0;
  }

  constructor(scene: Phaser.Scene, x: number, y: number, peerId: string) {
    super(scene, x, y, 'roberto_d_00');

    this.peerId = peerId;
    this.targetX = x;
    this.targetY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.CHARACTERS);
    this.setFlipX(false);

    // Ajuste da hitbox física do jogador remoto
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(20, 32);
      body.setOffset(22, 28);
      body.setImmovable(true);
    }

    // Leve tonalidade ciano/azul para diferenciar visualmente do jogador local
    this.setTint(0x7dd3fc);

    // Etiqueta com nome do aliado acima do personagem
    const shortId = peerId.slice(0, 5);
    this.nameTag = scene.add.text(x, y - 34, `Aliado [${shortId}]`, {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#38bdf8',
      stroke: '#030712',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);

    this.hpBar = scene.add.graphics().setDepth(CONSTANTS.DEPTH.UI);
    this.renderHpBar();
  }

  public applyNetworkState(state: PlayerNetworkState) {
    this.targetX = state.x;
    this.targetY = state.y;
    this.facing = state.facing;
    this.isAttacking = state.isAttacking;
    this.isShooting = state.isShooting;
    this.isDefending = state.isDefending;
    this.currentHp = state.currentHp;
    this.maxHp = state.maxHp;

    this.setFlipX(false);

    if (this.currentHp <= 0) {
      this.play(this.facing === 'd' ? 'roberto_death_d' : 'roberto_death_e', true);
      return;
    }

    if (this.isDefending) {
      this.setTexture(this.facing === 'd' ? 'roberto_d_08' : 'roberto_e_08');
      return;
    }

    if (state.anim && this.anims && this.scene) {
      if (this.anims.currentAnim?.key !== state.anim) {
        this.play(state.anim, true);
      }
    } else {
      this.stop();
      this.setTexture(this.facing === 'd' ? 'roberto_d_00' : 'roberto_e_00');
    }

    this.renderHpBar();
  }

  public remoteMeleeAttack(enemyGroup?: Phaser.GameObjects.Group) {
    this.isAttacking = true;
    this.setFlipX(false);
    const attackAnim = this.facing === 'd' ? 'roberto_attack_d' : 'roberto_attack_e';
    this.play(attackAnim, true);
    AudioService.playAttackSwing();

    // Dano de espada do aliado em inimigos próximos
    if (enemyGroup) {
      const enemies = enemyGroup.getChildren();
      const attackRange = 40;
      enemies.forEach(enemyObj => {
        const enemy = enemyObj as unknown as Entity;
        if (enemy.active && enemy.health && !enemy.health.isDead()) {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
          if (dist <= attackRange) {
            enemy.health.takeDamage(2);
            if (enemy.movement) {
              enemy.movement.applyKnockback(this.x, this.y, 110, 120);
            }
          }
        }
      });
    }

    this.scene.time.delayedCall(250, () => {
      this.isAttacking = false;
    });
  }

  public remoteShootArrow(arrowGroup: Phaser.GameObjects.Group, targetX: number, targetY: number) {
    this.isShooting = true;
    this.setFlipX(false);

    const isAimingUp = targetY < this.y - 45 && Math.abs(targetX - this.x) < 50;
    let shootAnim = this.facing === 'd' ? 'roberto_shoot_d' : 'roberto_shoot_e';
    if (isAimingUp) {
      shootAnim = this.facing === 'd' ? 'roberto_shoot_up_d' : 'roberto_shoot_up_e';
    }
    this.play(shootAnim, true);
    AudioService.playAttackSwing();

    const arrowX = this.x + (this.facing === 'd' ? 14 : -14);
    const arrowY = this.y - 2;

    const arrow = new ArrowProjectile(
      this.scene,
      arrowX,
      arrowY,
      targetX,
      targetY,
      2 // Dano da flecha do parceiro
    );
    arrowGroup.add(arrow);

    this.scene.time.delayedCall(220, () => {
      this.isShooting = false;
    });
  }

  private renderHpBar() {
    if (!this.hpBar || !this.active) return;
    this.hpBar.clear();

    const w = 24;
    const h = 3;
    const bx = this.x - w / 2;
    const by = this.y - 27;

    this.hpBar.fillStyle(0x0f172a, 0.8);
    this.hpBar.fillRect(bx - 1, by - 1, w + 2, h + 2);

    const pct = Math.max(0, Math.min(1, this.currentHp / (this.maxHp || 1)));
    this.hpBar.fillStyle(0x38bdf8, 1);
    this.hpBar.fillRect(bx, by, Math.floor(w * pct), h);
  }

  public override update(time: number, delta: number) {
    super.update(time, delta);

    if (!this.active) return;

    // Interpolação suave de posição (evita saltos bruscos de lag)
    this.x = Phaser.Math.Linear(this.x, this.targetX, 0.25);
    this.y = Phaser.Math.Linear(this.y, this.targetY, 0.25);

    if (this.nameTag && this.nameTag.active) {
      this.nameTag.setPosition(this.x, this.y - 34);
    }

    this.renderHpBar();
  }

  public override destroy(fromScene?: boolean) {
    if (this.nameTag) {
      this.nameTag.destroy();
    }
    if (this.hpBar) {
      this.hpBar.destroy();
    }
    super.destroy(fromScene);
  }
}
