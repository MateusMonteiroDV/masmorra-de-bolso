import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { ActiveRelic, GameState } from '../core/GameState';
import { RelicSystem } from '../systems/RelicSystem';
import { AudioService } from '../systems/AudioService';

export class RelicSelectModal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Graphics;
  private contentContainer: Phaser.GameObjects.Container;
  private onChosenCallback?: (relic: ActiveRelic) => void;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.setDepth(CONSTANTS.DEPTH.MODAL);
    scene.add.existing(this);

    // Fundo escuro semi-transparente
    this.overlay = scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.75);
    this.overlay.fillRect(0, 0, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT);
    this.add(this.overlay);

    this.contentContainer = scene.add.container(0, 0);
    this.add(this.contentContainer);

    this.setVisible(false);
  }

  public show(onChosen: (relic: ActiveRelic) => void) {
    this.onChosenCallback = onChosen;
    this.setVisible(true);
    this.contentContainer.removeAll(true);

    // Título do Modal
    const title = this.scene.add.text(CONSTANTS.GAME_WIDTH / 2, 38, 'ESCOLHA UMA RELÍQUIA', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#fbbf24',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.contentContainer.add(title);

    // Obter 3 relíquias que o jogador ainda não tem
    const currentRelicIds = GameState.activeRelics.map(r => r.id);
    const choices = RelicSystem.getRandomRelicChoices(3, currentRelicIds);

    const cardWidth = 110;
    const cardHeight = 130;
    const totalWidth = choices.length * cardWidth + (choices.length - 1) * 16;
    const startX = (CONSTANTS.GAME_WIDTH - totalWidth) / 2 + cardWidth / 2;
    const cardY = 125;

    choices.forEach((relic, index) => {
      const cx = startX + index * (cardWidth + 16);

      // Card Container
      const cardContainer = this.scene.add.container(cx, cardY);

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x1e293b, 0.95);
      bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
      bg.lineStyle(2, 0x3b82f6, 0.9);
      bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
      cardContainer.add(bg);

      // Ícone
      const icon = this.scene.add.image(0, -32, relic.icon);
      icon.setScale(2);
      cardContainer.add(icon);

      // Nome
      const nameText = this.scene.add.text(0, -4, relic.name, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#f8fafc',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: cardWidth - 12 }
      }).setOrigin(0.5);
      cardContainer.add(nameText);

      // Descrição
      const descText = this.scene.add.text(0, 30, relic.description, {
        fontFamily: 'monospace',
        fontSize: '7.5px',
        color: '#94a3b8',
        align: 'center',
        wordWrap: { width: cardWidth - 12 }
      }).setOrigin(0.5);
      cardContainer.add(descText);

      // Tornar clicável com efeito hover
      bg.setInteractive(new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight), Phaser.Geom.Rectangle.Contains);

      bg.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x334155, 1);
        bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
        bg.lineStyle(2, 0x60a5fa, 1);
        bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
        cardContainer.setScale(1.04);
      });

      bg.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x1e293b, 0.95);
        bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
        bg.lineStyle(2, 0x3b82f6, 0.9);
        bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
        cardContainer.setScale(1.0);
      });

      bg.on('pointerdown', () => {
        AudioService.playBuyUpgrade();
        GameState.addRelic(relic);
        this.setVisible(false);
        this.contentContainer.removeAll(true);
        if (this.onChosenCallback) {
          this.onChosenCallback(relic);
        }
      });

      this.contentContainer.add(cardContainer);
    });
  }
}
