import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';
import { GameState } from '../../core/GameState';
import { AudioService } from '../../systems/AudioService';

export class CoinDrop extends Phaser.Physics.Arcade.Sprite {
  public value: number;
  private magnetRadius: number = 55;
  private magnetSpeed: number = 140;

  private isCollected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number = 1) {
    super(scene, x, y, 'moeda_0');
    this.value = value;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.DROPS);
    this.setScale(0.5); // Escala adequada para 64x64 pixel coin

    this.play('anim_moeda');

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(20, 20);
      body.setOffset(22, 22);
      body.setDrag(150, 150);
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 25;
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  public updateMagnet(player: Phaser.GameObjects.Sprite) {
    if (this.isCollected) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist < this.magnetRadius) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(Math.cos(angle) * this.magnetSpeed, Math.sin(angle) * this.magnetSpeed);

      if (dist < 14) {
        this.collect();
      }
    }
  }

  public collect() {
    if (this.isCollected) return;
    this.isCollected = true;

    // Desativa colisão física para evitar múltiplas coletas
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      this.setVelocity(0, 0);
    }

    AudioService.playCoin();
    GameState.addRunGold(this.value);

    // Toca a animação de brilho/partículas de desaparecimento
    this.play('anim_moeda_collect');
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.destroy();
    });

    // Fallback de segurança para garantir remoção
    this.scene.time.delayedCall(400, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }
}
