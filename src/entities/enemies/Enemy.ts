import * as Phaser from 'phaser';
import { Entity } from '../Entity';
import { HealthComponent } from '../../components/HealthComponent';
import { MovementComponent } from '../../components/MovementComponent';
import { CONSTANTS } from '../../core/Constants';
import { CoinDrop } from '../items/CoinDrop';
import { ArrowDrop } from '../items/ArrowDrop';
import { EventBus } from '../../core/EventBus';
import { splitCoinReward } from '../../core/Economy';

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

  public applyDifficultyScale(hpMult: number, speedMult: number, damageMult: number, goldMult: number = 1) {
    const scaledHp = Math.max(1, Math.round(this.health.maxHp * hpMult));
    this.health.maxHp = scaledHp;
    this.health.currentHp = scaledHp;
    this.movement.baseSpeed = Math.round(this.movement.baseSpeed * speedMult);
    this.contactDamage = Math.max(1, Math.round(this.contactDamage * damageMult));
    this.goldReward = Math.max(1, Math.round(this.goldReward * goldMult));
  }

  protected spawnDrops() {
    if (!this.dropGroup) return;
    const coinValues = splitCoinReward(this.goldReward, CONSTANTS.ECONOMY.MAX_COINS_PER_DROP);
    coinValues.forEach(coinValue => {
      const offsetX = coinValues.length > 1 ? (Math.random() - 0.5) * 16 : 0;
      const offsetY = coinValues.length > 1 ? (Math.random() - 0.5) * 16 : 0;
      this.dropGroup!.add(new CoinDrop(this.scene, this.x + offsetX, this.y + offsetY, coinValue));
    });
    this.dropGroup.add(new ArrowDrop(this.scene, this.x + 6, this.y - 4));
  }

  public die() {
    if (!this.active) return;

    this.spawnDrops();
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
