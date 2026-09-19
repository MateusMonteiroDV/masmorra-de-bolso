import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';
import { Player } from '../player/Player';
import { GameState } from '../../core/GameState';
import { AudioService } from '../../systems/AudioService';

export class ArrowDrop extends Phaser.Physics.Arcade.Sprite {
  private magnetRadius: number = 48;
  private magnetSpeed: number = 170;
  private isCollected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'arrow_sprite');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.DROPS);
    this.setScale(0.85);
    this.setRotation(-Math.PI / 4);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(16, 16);
      body.setOffset(4, 4);
      body.setAllowGravity(false);
    }

    // Leve flutuação visual
    scene.tweens.add({
      targets: this,
      y: y - 4,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  public updateMagnet(player: Player) {
    if (this.isCollected || !this.active || !player.active || player.health.isDead()) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist <= this.magnetRadius) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(
        Math.cos(angle) * this.magnetSpeed,
        Math.sin(angle) * this.magnetSpeed
      );
    } else {
      this.setVelocity(0, 0);
    }
  }

  public collect() {
    if (this.isCollected || !this.active) return;
    this.isCollected = true;

    GameState.addArrows(1);
    AudioService.playCoin();

    // Popup flutuante de +1 Flecha
    const popup = this.scene.add.text(this.x, this.y - 10, '+1 🏹', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#38bdf8',
      stroke: '#030712',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);

    this.scene.tweens.add({
      targets: popup,
      y: this.y - 24,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => popup.destroy()
    });

    this.destroy();
  }
}
