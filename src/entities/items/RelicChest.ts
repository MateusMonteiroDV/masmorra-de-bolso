import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';
import { EventBus } from '../../core/EventBus';

export class RelicChest extends Phaser.Physics.Arcade.Sprite {
  public isOpen: boolean = false;
  private promptText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bau_0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.CHESTS);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      body.setSize(28, 14);
      body.setOffset(2, 20);
    }
  }

  public checkPlayerNear(player: Phaser.GameObjects.Sprite): boolean {
    if (this.isOpen || !this.active || !this.scene || !this.scene.add || !player || !player.active) {
      if (this.promptText) {
        this.promptText.destroy();
        this.promptText = undefined;
      }
      return false;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const isNear = dist < 30;

    if (isNear && !this.promptText) {
      try {
        this.promptText = this.scene.add.text(this.x, this.y - 22, '[E] Abrir', {
          fontSize: '9px',
          color: '#fde047',
          fontFamily: 'monospace',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
      } catch (e) {}
    } else if (!isNear && this.promptText) {
      this.promptText.destroy();
      this.promptText = undefined;
    }

    return isNear;
  }

  public open() {
    if (this.isOpen) return;

    this.isOpen = true;

    if (this.promptText) {
      this.promptText.destroy();
      this.promptText = undefined;
    }

    // A tampa abre e o baú permanece no último quadro (aberto) depois da escolha da relíquia
    this.play('bau_abrindo');
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.active) return;
      this.setTexture('bau_3');
      // Dispara evento para o HUD abrir a janela de seleção de 3 relíquias
      EventBus.emit(CONSTANTS.EVENTS.REQUEST_RELIC_CHOICE);
    });
  }

  public override destroy(fromScene?: boolean) {
    if (this.promptText) {
      this.promptText.destroy();
    }
    super.destroy(fromScene);
  }
}
