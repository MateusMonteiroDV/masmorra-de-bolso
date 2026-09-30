import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';
import { GameState } from '../../core/GameState';
import { AudioService } from '../../systems/AudioService';

export class CoinDrop extends Phaser.Physics.Arcade.Sprite {
  public value: number;
  private magnetRadius: number = 60;
  private magnetSpeed: number = 160;
  private isReadyToCollect: boolean = false;
  private isCollected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number = 1) {
    super(scene, x, y, 'moeda_0');
    this.value = value;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.DROPS);
    this.setScale(1.0); // O sprite possui 64x64 com a moeda em 19x20, escala 1.0 garante tamanho nítido e perfeito

    this.play('anim_moeda');

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(18, 18);
      body.setOffset(23, 27);
      body.setDrag(220, 220);

      // Dispersão física dinâmica ao saltar do monstro
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 40;
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }

    // Leve salto vertical para dar efeito visual de quique ao dropar
    scene.tweens.add({
      targets: this,
      y: y - 10,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    // Pequeno intervalo antes de permitir atração magnética ou coleta (evita coleta instantânea invisível no melee)
    scene.time.delayedCall(300, () => {
      this.isReadyToCollect = true;
    });
  }

  public canCollect(): boolean {
    return this.isReadyToCollect && !this.isCollected && this.active;
  }

  public updateMagnet(player: Phaser.GameObjects.Sprite) {
    if (!this.canCollect() || !player || !player.active) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist < this.magnetRadius) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(Math.cos(angle) * this.magnetSpeed, Math.sin(angle) * this.magnetSpeed);

      if (dist < 16) {
        this.collect();
      }
    }
  }

  public collect() {
    if (this.isCollected || !this.active) return;
    this.isCollected = true;

    // Desativa colisão física para evitar múltiplas coletas
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      this.setVelocity(0, 0);
    }

    AudioService.playCoin();
    GameState.addRunGold(this.value);

    // Texto flutuante dourado de feedback de ouro coletado (+1 🪙)
    const popup = this.scene.add.text(this.x, this.y - 12, `+${this.value} 🪙`, {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#fbbf24',
      fontStyle: 'bold',
      stroke: '#030712',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);

    this.scene.tweens.add({
      targets: popup,
      y: this.y - 28,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => popup.destroy()
    });

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
