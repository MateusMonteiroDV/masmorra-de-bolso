import * as Phaser from 'phaser';
import { HealthComponent } from '../components/HealthComponent';
import { MovementComponent } from '../components/MovementComponent';

export abstract class Entity extends Phaser.Physics.Arcade.Sprite {
  public health!: HealthComponent;
  public movement!: MovementComponent;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    // Adiciona à cena e ao sistema de física do Phaser
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configuração padrão de colisão física Arcade
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(false);
    }
  }

  public override update(time: number, delta: number) {
    super.update(time, delta);

    if (this.health) {
      this.health.update(delta);
    }
    if (this.movement) {
      this.movement.update(delta);
    }
  }
}
