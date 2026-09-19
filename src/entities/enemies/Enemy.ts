import * as Phaser from 'phaser';
import { Entity } from '../Entity';
import { HealthComponent } from '../../components/HealthComponent';
import { MovementComponent } from '../../components/MovementComponent';
import { CONSTANTS } from '../../core/Constants';
import { CoinDrop } from '../items/CoinDrop';
import { ArrowDrop } from '../items/ArrowDrop';
import { EventBus } from '../../core/EventBus';

export abstract class Enemy extends Entity {
  public goldReward: number = 2;
  public contactDamage: number = 1;
  public contactCooldownTimer: number = 0;
  protected dropGroup?: Phaser.GameObjects.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    hp: number,
    speed: number,
    goldReward: number = 2,
    dropGroup?: Phaser.GameObjects.Group
  ) {
    super(scene, x, y, texture);

    this.goldReward = goldReward;
    this.dropGroup = dropGroup;
    this.setDepth(CONSTANTS.DEPTH.CHARACTERS);

    this.health = new HealthComponent(this, hp, false, 150);
    this.movement = new MovementComponent(this, speed);

    this.health.setCallbacks(() => this.die());
  }

  public die() {
    if (!this.active) return;

    // Dropa moedas de ouro e 1 flecha para reabastecimento
    if (this.dropGroup) {
      const numCoins = Math.max(1, Math.floor(this.goldReward));
      for (let i = 0; i < numCoins; i++) {
        const coin = new CoinDrop(this.scene, this.x, this.y, 1);
        this.dropGroup.add(coin);
      }

      // Drop de 1 flecha por inimigo derrotado conforme solicitado
      const arrow = new ArrowDrop(this.scene, this.x + 6, this.y - 4);
      this.dropGroup.add(arrow);
    }

    EventBus.emit(CONSTANTS.EVENTS.ENEMY_DIED, this);

    // Efeito de explosão de poeira ao morrer
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.destroy();
      }
    });
  }

  public override update(time: number, delta: number) {
    super.update(time, delta);
    if (this.contactCooldownTimer > 0) {
      this.contactCooldownTimer -= delta;
    }
  }

  public abstract aiBehavior(player: Phaser.GameObjects.Sprite, delta: number): void;
}
