import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { GameState } from '../core/GameState';
import { UPGRADE_DEFINITIONS, UpgradeSystem } from '../systems/UpgradeSystem';
import { AudioService } from '../systems/AudioService';

export class ShopModal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;
  private contentContainer: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;
  private onCloseCallback?: () => void;
  private escKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.setDepth(CONSTANTS.DEPTH.MODAL);
    scene.add.existing(this);

    this.overlay = scene.add.rectangle(
      CONSTANTS.GAME_WIDTH / 2,
      CONSTANTS.GAME_HEIGHT / 2,
      CONSTANTS.GAME_WIDTH,
      CONSTANTS.GAME_HEIGHT,
      0x000000,
      0.82
    );
    this.overlay.setInteractive();
    this.add(this.overlay);

    this.contentContainer = scene.add.container(0, 0);
    this.add(this.contentContainer);

    this.setVisible(false);
  }

  public show(onClose: () => void) {
    this.onCloseCallback = onClose;
    this.setVisible(true);

    if (this.scene.input.keyboard) {
      this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.escKey.once('down', () => this.close());
    }

    this.refreshUI();
  }

  public close() {
    if (this.escKey) {
      this.escKey.removeAllListeners();
      this.escKey = undefined;
    }

    this.setVisible(false);
    this.contentContainer.removeAll(true);
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public refreshUI() {
    this.contentContainer.removeAll(true);

    const modalWidth = 320;
    const modalHeight = 210;
    const mx = (CONSTANTS.GAME_WIDTH - modalWidth) / 2;
    const my = (CONSTANTS.GAME_HEIGHT - modalHeight) / 2;

    // Fundo do Menu
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x181a24, 0.98);
    bg.fillRoundedRect(mx, my, modalWidth, modalHeight, 6);
    bg.lineStyle(2, 0xd97706, 1);
    bg.strokeRoundedRect(mx, my, modalWidth, modalHeight, 6);
    this.contentContainer.add(bg);

    // Título
    const title = this.scene.add.text(CONSTANTS.GAME_WIDTH / 2, my + 16, 'MELHORIAS PERMANENTES', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f59e0b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.contentContainer.add(title);

    // Ouro do Jogador
    this.goldText = this.scene.add.text(CONSTANTS.GAME_WIDTH / 2, my + 30, `Ouro Guardado: ${GameState.bankedGold} G`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#fbbf24'
    }).setOrigin(0.5);
    this.contentContainer.add(this.goldText);

    // Lista de Upgrades
    let startY = my + 46;
    const itemHeight = 34;

    UPGRADE_DEFINITIONS.forEach((def, index) => {
      const iy = startY + index * itemHeight;
      const currentLevel = GameState.upgrades[def.key];
      const cost = UpgradeSystem.getUpgradeCost(def.key);
      const isMax = currentLevel >= def.maxLevel;
      const canAfford = !isMax && cost !== null && GameState.bankedGold >= cost;

      // Linha de item
      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(0x232736, 0.7);
      itemBg.fillRoundedRect(mx + 10, iy, modalWidth - 20, itemHeight - 4, 4);
      this.contentContainer.add(itemBg);

      // Nome do Upgrade e Nível
      const levelDots = '● '.repeat(currentLevel) + '○ '.repeat(def.maxLevel - currentLevel);
      const nameText = this.scene.add.text(mx + 16, iy + 4, `${def.name} [${levelDots.trim()}]`, {
        fontFamily: 'monospace',
        fontSize: '8.5px',
        color: '#f8fafc',
        fontStyle: 'bold'
      });
      this.contentContainer.add(nameText);

      // Descrição
      const descText = this.scene.add.text(mx + 16, iy + 17, def.description, {
        fontFamily: 'monospace',
        fontSize: '7.5px',
        color: '#94a3b8'
      });
      this.contentContainer.add(descText);

      // Botão de Compra
      const btnX = mx + modalWidth - 62;
      const btnY = iy + 5;
      const btnW = 46;
      const btnH = 20;

      const btnBg = this.scene.add.graphics();
      const btnColor = isMax ? 0x475569 : (canAfford ? 0x059669 : 0x7f1d1d);
      btnBg.fillStyle(btnColor, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 3);
      this.contentContainer.add(btnBg);

      const btnLabel = isMax ? 'MAX' : `${cost} G`;
      const btnText = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, btnLabel, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.contentContainer.add(btnText);

      if (canAfford && cost !== null) {
        btnBg.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
        btnBg.on('pointerdown', () => {
          const success = GameState.purchaseUpgrade(def.key, cost);
          if (success) {
            AudioService.playBuyUpgrade();
            this.refreshUI();
          }
        });
      }
    });

    // Botão Fechar
    const closeBtnY = my + modalHeight - 22;
    const closeBtn = this.scene.add.text(CONSTANTS.GAME_WIDTH / 2, closeBtnY, '[ X FECHAR ]', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#94a3b8'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setColor('#f87171'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#94a3b8'));
    closeBtn.on('pointerdown', () => {
      this.close();
    });
    this.contentContainer.add(closeBtn);
  }
}
