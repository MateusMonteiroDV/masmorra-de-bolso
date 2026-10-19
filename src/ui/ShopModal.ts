import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { GameState } from '../core/GameState';
import { UPGRADE_DEFINITIONS, getUpgradeCost } from '../systems/UpgradeSystem';
import { AudioService } from '../systems/AudioService';

export class ShopModal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;
  private contentContainer: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;
  private onCloseCallback?: () => void;
  private escKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.setDepth(CONSTANTS.DEPTH.MODAL + 100);
    scene.add.existing(this);

    const w = scene.scale.width;
    const h = scene.scale.height;

    this.overlay = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.92);
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

    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;
    this.overlay.setPosition(screenW / 2, screenH / 2);
    this.overlay.setSize(screenW, screenH);

    const modalWidth = 320;
    const modalHeight = 232;
    const mx = (screenW - modalWidth) / 2;
    const my = (screenH - modalHeight) / 2;

    // Fundo do Menu
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x181a24, 0.98);
    bg.fillRoundedRect(mx, my, modalWidth, modalHeight, 6);
    bg.lineStyle(2, 0xd97706, 1);
    bg.strokeRoundedRect(mx, my, modalWidth, modalHeight, 6);
    this.contentContainer.add(bg);

    // Título
    const title = this.scene.add.text(screenW / 2, my + 12, 'MELHORIAS PERMANENTES', {
      fontFamily: 'monospace',
      fontSize: '10.5px',
      color: '#f59e0b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.contentContainer.add(title);

    // Ouro do Jogador
    this.goldText = this.scene.add.text(screenW / 2, my + 24, `Ouro Guardado: ${GameState.bankedGold} G`, {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#fbbf24'
    }).setOrigin(0.5);
    this.contentContainer.add(this.goldText);

    // Lista de Upgrades
    let startY = my + 34;
    const itemHeight = 27;

    UPGRADE_DEFINITIONS.forEach((def, index) => {
      const iy = startY + index * itemHeight;
      const currentLevel = Math.min(def.maxLevel, GameState.upgrades[def.key] ?? 0);
      const cost = getUpgradeCost(def.key);
      const isMax = currentLevel >= def.maxLevel;
      const canAfford = !isMax && cost !== null && GameState.bankedGold >= cost;

      // Linha de item
      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(0x232736, 0.7);
      itemBg.fillRoundedRect(mx + 8, iy, modalWidth - 16, 24, 3);
      this.contentContainer.add(itemBg);

      // Nome do Upgrade e Nível (pontos visuais)
      const levelDots = '● '.repeat(currentLevel) + '○ '.repeat(Math.max(0, def.maxLevel - currentLevel));
      const nameText = this.scene.add.text(mx + 13, iy + 2, `${def.name} [${levelDots.trim()}]`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#f8fafc',
        fontStyle: 'bold'
      });
      this.contentContainer.add(nameText);

      // Descrição
      const descText = this.scene.add.text(mx + 13, iy + 13, def.description, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#94a3b8'
      });
      this.contentContainer.add(descText);

      // Botão de Compra
      const btnW = 50;
      const btnH = 19;
      const btnX = mx + modalWidth - btnW - 10;
      const btnY = iy + 2.5;

      const btnBg = this.scene.add.graphics();
      const btnColor = isMax ? 0x475569 : (canAfford ? 0x059669 : 0x7f1d1d);
      btnBg.fillStyle(btnColor, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 3);
      this.contentContainer.add(btnBg);

      const btnLabel = isMax ? 'MAX' : `${cost} G`;
      const btnText = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, btnLabel, {
        fontFamily: 'monospace',
        fontSize: '7.5px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.contentContainer.add(btnText);

      if (canAfford && cost !== null) {
        btnBg.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
        btnBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          (pointer as any).isVirtualControl = true;
          const success = GameState.purchaseUpgrade(def.key, cost);
          if (success) {
            AudioService.playBuyUpgrade();
            this.refreshUI();
          }
        });
      }
    });

    // Botão Fechar Centralizado com área de toque ampliada
    const closeBtnY = my + modalHeight - 13;
    const closeBtn = this.scene.add.text(screenW / 2, closeBtnY, '[ X FECHAR ]', {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#cbd5e1',
      backgroundColor: '#1e293b',
      padding: { x: 8, y: 3 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setColor('#f87171'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#cbd5e1'));
    closeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      (pointer as any).isVirtualControl = true;
      this.close();
    });
    this.contentContainer.add(closeBtn);
  }
}
