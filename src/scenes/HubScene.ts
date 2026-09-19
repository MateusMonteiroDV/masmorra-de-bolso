import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { ASSET_KEYS } from '../assets/AssetManifest';
import { GameState } from '../core/GameState';
import { ShopModal } from '../ui/ShopModal';
import { Player } from '../entities/player/Player';

export class HubScene extends Phaser.Scene {
  private player!: Player;
  private shopNpc!: Phaser.GameObjects.Sprite;
  private portal!: Phaser.Physics.Arcade.Sprite;
  private shopModal!: ShopModal;
  private isModalOpen: boolean = false;
  private npcPromptText?: Phaser.GameObjects.Text;
  private portalPromptText?: Phaser.GameObjects.Text;
  private goldDisplayText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HubScene' });
  }

  public create() {
    const width = CONSTANTS.GAME_WIDTH;
    const height = CONSTANTS.GAME_HEIGHT;

    // 1. Cenário do Hub (Chão de pedra aconchegante)
    const tileSize = CONSTANTS.TILE_SIZE;
    for (let x = 0; x < width; x += tileSize) {
      for (let y = 0; y < height; y += tileSize) {
        const floor = this.add.image(x + tileSize / 2, y + tileSize / 2, ASSET_KEYS.ENVIRONMENT.FLOOR);
        floor.setDepth(CONSTANTS.DEPTH.FLOOR);
      }
    }

    // Paredes ao redor
    const walls = this.physics.add.staticGroup();
    for (let x = 0; x < width; x += tileSize) {
      const topW = walls.create(x + tileSize / 2, tileSize / 2, ASSET_KEYS.ENVIRONMENT.WALL) as Phaser.Physics.Arcade.Image;
      const botW = walls.create(x + tileSize / 2, height - tileSize / 2, ASSET_KEYS.ENVIRONMENT.WALL) as Phaser.Physics.Arcade.Image;
      topW.setDepth(CONSTANTS.DEPTH.WALLS);
      botW.setDepth(CONSTANTS.DEPTH.WALLS);
    }
    for (let y = 0; y < height; y += tileSize) {
      const leftW = walls.create(tileSize / 2, y + tileSize / 2, ASSET_KEYS.ENVIRONMENT.WALL) as Phaser.Physics.Arcade.Image;
      const rightW = walls.create(width - tileSize / 2, y + tileSize / 2, ASSET_KEYS.ENVIRONMENT.WALL) as Phaser.Physics.Arcade.Image;
      leftW.setDepth(CONSTANTS.DEPTH.WALLS);
      rightW.setDepth(CONSTANTS.DEPTH.WALLS);
    }

    // 2. Fogueira no Centro
    const campfire = this.add.sprite(width / 2, height / 2, ASSET_KEYS.ENVIRONMENT.CAMPFIRE);
    campfire.setDepth(CONSTANTS.DEPTH.DECORATION);
    campfire.setScale(1.5);
    this.tweens.add({
      targets: campfire,
      scaleX: 1.6,
      scaleY: 1.4,
      yoyo: true,
      repeat: -1,
      duration: 350
    });

    // 3. NPC Mercador da Loja à Esquerda
    this.shopNpc = this.add.sprite(width / 2 - 90, height / 2 - 20, ASSET_KEYS.CHARACTERS.NPC_SHOP);
    this.shopNpc.setDepth(CONSTANTS.DEPTH.CHARACTERS);
    this.shopNpc.setScale(1.3);

    const npcLabel = this.add.text(this.shopNpc.x, this.shopNpc.y - 18, 'Ferreiro da Base', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#f59e0b',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    npcLabel.setDepth(CONSTANTS.DEPTH.UI);

    // 4. Portal para a Masmorra à Direita
    this.portal = this.physics.add.sprite(width / 2 + 100, height / 2, ASSET_KEYS.ENVIRONMENT.PORTAL);
    this.portal.setDepth(CONSTANTS.DEPTH.DECORATION);
    this.tweens.add({
      targets: this.portal,
      rotation: 6.28,
      duration: 3000,
      repeat: -1
    });

    const portalLabel = this.add.text(this.portal.x, this.portal.y - 20, 'Entrar na Masmorra', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#c084fc',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    portalLabel.setDepth(CONSTANTS.DEPTH.UI);

    // 5. Jogador na Base
    this.player = new Player(this, width / 2, height / 2 + 35);
    this.physics.add.collider(this.player, walls);

    // 6. Textos de HUD do Hub
    this.goldDisplayText = this.add.text(12, 10, `Ouro: ${GameState.bankedGold} G`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(CONSTANTS.DEPTH.UI);

    this.add.text(width - 12, 10, `Tentativas: ${GameState.totalRuns}`, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#94a3b8',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0).setDepth(CONSTANTS.DEPTH.UI);

    // 7. Janela Modal de Loja
    this.shopModal = new ShopModal(this);

    // Câmera do Hub
    this.cameras.main.setBackgroundColor('#0d0e15');
  }

  public override update(time: number, delta: number) {
    if (this.isModalOpen) return;

    this.player.update(time, delta);
    this.goldDisplayText.setText(`Ouro: ${GameState.bankedGold} G`);

    // 1. Proximidade com o NPC Ferreiro / Loja
    const distNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shopNpc.x, this.shopNpc.y);
    if (distNpc < 30) {
      if (!this.npcPromptText) {
        this.npcPromptText = this.add.text(this.shopNpc.x, this.shopNpc.y + 16, '[E] Melhorias', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#38bdf8',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
      }

      if (this.player.controller.isInteractPressed()) {
        this.openShop();
      }
    } else if (this.npcPromptText) {
      this.npcPromptText.destroy();
      this.npcPromptText = undefined;
    }

    // 2. Proximidade com o Portal da Masmorra
    const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
    if (distPortal < 28) {
      if (!this.portalPromptText) {
        this.portalPromptText = this.add.text(this.portal.x, this.portal.y + 18, '[E] Descer', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#a855f7',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
      }

      if (this.player.controller.isInteractPressed()) {
        this.startDungeonRun();
      }
    } else if (this.portalPromptText) {
      this.portalPromptText.destroy();
      this.portalPromptText = undefined;
    }
  }

  private openShop() {
    this.isModalOpen = true;
    this.player.setVelocity(0, 0);
    this.shopModal.show(() => {
      this.isModalOpen = false;
      this.goldDisplayText.setText(`Ouro: ${GameState.bankedGold} G`);
    });
  }

  private startDungeonRun() {
    GameState.startNewRun();
    this.scene.start('DungeonScene');
    this.scene.launch('UIScene');
  }
}
