import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';
import { ASSET_KEYS } from '../../assets/AssetManifest';
import { EventBus } from '../../core/EventBus';

export class RelicChest extends Phaser.Physics.Arcade.Sprite {
  public isOpen: boolean = false;
  private promptText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ASSET_KEYS.ITEMS.CHEST);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH.CHESTS);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
    }
  }

  public checkPlayerNear(player: Phaser.GameObjects.Sprite): boolean {
    if (this.isOpen) return false;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const isNear = dist < 24;

    if (isNear && !this.promptText) {
      this.promptText = this.scene.add.text(this.x, this.y - 14, '[E] Abrir', {
        fontSize: '9px',
        color: '#fde047',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
    } else if (!isNear && this.promptText) {
      this.promptText.destroy();
      this.promptText = undefined;
    }

    return isNear;
  }

  public open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.setTexture(ASSET_KEYS.ITEMS.CHEST_OPEN);

    if (this.promptText) {
      this.promptText.destroy();
      this.promptText = undefined;
    }

    // Dispara evento para o HUD abrir a janela de seleção de 3 relíquias
    EventBus.emit(CONSTANTS.EVENTS.REQUEST_RELIC_CHOICE);
  }

  public override destroy(fromScene?: boolean) {
    if (this.promptText) {
      this.promptText.destroy();
    }
    super.destroy(fromScene);
  }
}
