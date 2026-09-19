import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { GameState } from '../core/GameState';

export interface GameOverData {
  victory?: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  public create(data: GameOverData) {
    const isVictory = !!data.victory;
    const width = CONSTANTS.GAME_WIDTH;
    const height = CONSTANTS.GAME_HEIGHT;

    // Conclui a run e transfere todo o ouro para o banco permanente!
    const runGoldCollected = GameState.runGold;
    GameState.endRun(isVictory);

    // Fundo escuro
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0c10, 1);
    bg.fillRect(0, 0, width, height);

    // Efeito de vinheta
    const vignette = this.add.graphics();
    vignette.fillStyle(isVictory ? 0x059669 : 0x7f1d1d, 0.2);
    vignette.fillRect(0, 0, width, height);

    // Título Principal
    const titleColor = isVictory ? '#fbbf24' : '#ef4444';
    const titleText = isVictory ? 'MASMORRA CONQUISTADA!' : 'VOCÊ SUCUMBIU...';

    this.add.text(width / 2, 50, titleText, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    const subText = isVictory
      ? 'O Rei Slime foi derrotado com bravura!'
      : 'A escuridão da masmorra te consumiu.';

    this.add.text(width / 2, 72, subText, {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Painel de Estatísticas
    const panel = this.add.graphics();
    panel.fillStyle(0x1e293b, 0.9);
    panel.fillRoundedRect(width / 2 - 130, 95, 260, 95, 6);
    panel.lineStyle(1, 0x475569, 1);
    panel.strokeRoundedRect(width / 2 - 130, 95, 260, 95, 6);

    this.add.text(width / 2, 112, `Ouro Resgatado na Run: +${runGoldCollected} G`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#facc15',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 130, `Total Guardado no Cofre: ${GameState.bankedGold} G`, {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#e2e8f0'
    }).setOrigin(0.5);

    this.add.text(width / 2, 150, 'Use seu ouro na Base para comprar melhorias!', {
      fontFamily: 'monospace',
      fontSize: '7.5px',
      color: '#60a5fa'
    }).setOrigin(0.5);

    this.add.text(width / 2, 168, `Runs realizadas: ${GameState.totalRuns} | Chefes derrotados: ${GameState.totalBossKills}`, {
      fontFamily: 'monospace',
      fontSize: '7.5px',
      color: '#64748b'
    }).setOrigin(0.5);

    // Botão de Retorno à Base
    const btnW = 140;
    const btnH = 26;
    const btnX = width / 2;
    const btnY = 220;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x2563eb, 1);
    btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 4);

    const btnLabel = this.add.text(btnX, btnY, 'RETORNAR À BASE', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btnBg.setInteractive(new Phaser.Geom.Rectangle(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains);

    btnBg.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x3b82f6, 1);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 4);
    });

    btnBg.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2563eb, 1);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 4);
    });

    btnBg.on('pointerdown', () => {
      this.scene.start('HubScene');
    });
  }
}
