import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { AudioService } from '../systems/AudioService';

export class HealthComponent {
  public currentHp: number;
  public maxHp: number;
  public isInvulnerable: boolean = false;
  private invulnerableTimer: number = 0;
  private invulnerableDuration: number;
  private owner: Phaser.Physics.Arcade.Sprite;
  private onDeathCallback?: () => void;
  private onDamageCallback?: (amount: number) => void;
  private isPlayer: boolean;

  constructor(
    owner: Phaser.Physics.Arcade.Sprite,
    maxHp: number,
    isPlayer: boolean = false,
    invulnerableDuration: number = CONSTANTS.PLAYER.INVULNERABLE_DURATION
  ) {
    this.owner = owner;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.isPlayer = isPlayer;
    this.invulnerableDuration = invulnerableDuration;
  }

  public setCallbacks(onDeath?: () => void, onDamage?: (amount: number) => void) {
    this.onDeathCallback = onDeath;
    this.onDamageCallback = onDamage;
  }

  public takeDamage(amount: number): boolean {
    if (this.isInvulnerable || this.currentHp <= 0) {
      return false;
    }

    this.currentHp = Math.max(0, this.currentHp - amount);

    // Efeitos Sonoros
    if (this.isPlayer) {
      AudioService.playPlayerHurt();
    } else {
      AudioService.playEnemyHit();
    }

    // Feedback visual (Flash branco/vermelho)
    this.owner.scene.tweens.add({
      targets: this.owner,
      alpha: 0.2,
      yoyo: true,
      repeat: 2,
      duration: 50,
      onComplete: () => {
        if (this.owner.active) {
          this.owner.setAlpha(1);
        }
      }
    });

    // Invulnerabilidade temporária
    if (this.invulnerableDuration > 0) {
      this.isInvulnerable = true;
      this.invulnerableTimer = this.invulnerableDuration;
    }

    if (this.onDamageCallback) {
      this.onDamageCallback(amount);
    }

    if (this.currentHp <= 0) {
      if (this.onDeathCallback) {
        this.onDeathCallback();
      }
    }

    return true;
  }

  public heal(amount: number) {
    if (this.currentHp <= 0) return;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
  }

  public update(delta: number) {
    if (this.isInvulnerable) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
        this.owner.setAlpha(1);
      }
    }
  }

  public isDead(): boolean {
    return this.currentHp <= 0;
  }
}
