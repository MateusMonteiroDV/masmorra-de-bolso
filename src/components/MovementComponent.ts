import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { AudioService } from '../systems/AudioService';
import { HealthComponent } from './HealthComponent';

export class MovementComponent {
  private owner: Phaser.Physics.Arcade.Sprite;
  private healthComponent?: HealthComponent;

  public baseSpeed: number;
  public dashSpeed: number;
  public dashCooldown: number;
  public isDashing: boolean = false;
  public canDash: boolean = true;

  private dashDuration: number = CONSTANTS.PLAYER.DASH_DURATION;
  private dashTimer: number = 0;
  private dashCooldownTimer: number = 0;
  private dashVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  private isKnockedBack: boolean = false;
  private knockbackTimer: number = 0;

  constructor(
    owner: Phaser.Physics.Arcade.Sprite,
    baseSpeed: number,
    dashSpeed: number = CONSTANTS.PLAYER.DASH_SPEED,
    dashCooldown: number = CONSTANTS.PLAYER.DASH_COOLDOWN,
    healthComponent?: HealthComponent
  ) {
    this.owner = owner;
    this.baseSpeed = baseSpeed;
    this.dashSpeed = dashSpeed;
    this.dashCooldown = dashCooldown;
    this.healthComponent = healthComponent;
  }

  public moveInDirection(dirX: number, dirY: number) {
    if (this.isDashing || this.isKnockedBack) {
      return;
    }

    if (dirX === 0 && dirY === 0) {
      this.owner.setVelocity(0, 0);
      return;
    }

    // Normalização para velocidade uniforme em 8 direções
    const vector = new Phaser.Math.Vector2(dirX, dirY).normalize();
    this.owner.setVelocity(vector.x * this.baseSpeed, vector.y * this.baseSpeed);
  }

  public dash(dirX: number, dirY: number): boolean {
    if (!this.canDash || this.isDashing || this.isKnockedBack) {
      return false;
    }

    // Se estiver parado ao dar dash, dá o dash na direção que o sprite está virado
    let vx = dirX;
    let vy = dirY;
    if (vx === 0 && vy === 0) {
      vx = this.owner.flipX ? -1 : 1;
    }

    const vector = new Phaser.Math.Vector2(vx, vy).normalize();
    this.dashVelocity.set(vector.x * this.dashSpeed, vector.y * this.dashSpeed);

    this.isDashing = true;
    this.canDash = false;
    this.dashTimer = this.dashDuration;
    this.dashCooldownTimer = this.dashCooldown;

    this.owner.setVelocity(this.dashVelocity.x, this.dashVelocity.y);

    // Invulnerabilidade temporária durante os quadros de dash (i-frames)
    if (this.healthComponent) {
      this.healthComponent.isInvulnerable = true;
    }

    AudioService.playDash();

    // Rastro fantasma visual durante o dash
    const ghost = this.owner.scene.add.sprite(this.owner.x, this.owner.y, this.owner.texture.key);
    ghost.setTint(0x60a5fa);
    ghost.setAlpha(0.6);
    ghost.setFlipX(this.owner.flipX);
    this.owner.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 160,
      onComplete: () => ghost.destroy()
    });

    return true;
  }

  public applyKnockback(fromX: number, fromY: number, force: number = 160, durationMs: number = 140) {
    const dir = new Phaser.Math.Vector2(this.owner.x - fromX, this.owner.y - fromY).normalize();
    this.owner.setVelocity(dir.x * force, dir.y * force);
    this.isKnockedBack = true;
    this.knockbackTimer = durationMs;
  }

  public update(delta: number) {
    // Atualizar Knockback
    if (this.isKnockedBack) {
      this.knockbackTimer -= delta;
      if (this.knockbackTimer <= 0) {
        this.isKnockedBack = false;
        this.owner.setVelocity(0, 0);
      }
    }

    // Atualizar Dash em andamento
    if (this.isDashing) {
      this.dashTimer -= delta;
      this.owner.setVelocity(this.dashVelocity.x, this.dashVelocity.y);

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        if (this.healthComponent) {
          this.healthComponent.isInvulnerable = false;
        }
      }
    }

    // Atualizar Cooldown do Dash
    if (!this.canDash) {
      this.dashCooldownTimer -= delta;
      if (this.dashCooldownTimer <= 0) {
        this.canDash = true;
      }
    }
  }
}
