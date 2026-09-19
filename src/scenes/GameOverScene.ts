import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { GameState } from '../core/GameState';
import { NetworkManager } from '../network/NetworkManager';
import { PlayerNetworkAction } from '../network/NetworkTypes';

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
    const isInMultiplayer = !!NetworkManager.currentRoomId;

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

    this.add.text(width / 2, 48, titleText, {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    let subText = isVictory
      ? 'O Rei Slime foi derrotado com bravura!'
      : 'A escuridão da masmorra te consumiu.';

    if (isInMultiplayer) {
      subText = isVictory
        ? 'A equipe conquistou a masmorra com sucesso!'
        : 'Todos os heróis caíram! Reagrupe no Lobby para tentar de novo.';
    }

    this.add.text(width / 2, 70, subText, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Painel de Estatísticas
    const panel = this.add.graphics();
    panel.fillStyle(0x1e293b, 0.9);
    panel.fillRoundedRect(width / 2 - 130, 92, 260, 95, 6);
    panel.lineStyle(1, 0x475569, 1);
    panel.strokeRoundedRect(width / 2 - 130, 92, 260, 95, 6);

    this.add.text(width / 2, 108, `Ouro Resgatado na Run: +${runGoldCollected} G`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#facc15',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 126, `Total Guardado no Cofre: ${GameState.bankedGold} G`, {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#e2e8f0'
    }).setOrigin(0.5);

    this.add.text(width / 2, 146, 'Use seu ouro na Base para comprar melhorias!', {
      fontFamily: 'monospace',
      fontSize: '7.5px',
      color: '#60a5fa'
    }).setOrigin(0.5);

    this.add.text(width / 2, 164, `Runs realizadas: ${GameState.totalRuns} | Chefes derrotados: ${GameState.totalBossKills}`, {
      fontFamily: 'monospace',
      fontSize: '7.5px',
      color: '#64748b'
    }).setOrigin(0.5);

    // Botão de Retorno: Se em multiplayer, volta à Sala de Espera (Lobby) mantendo a conexão!
    const btnW = isInMultiplayer ? 230 : 160;
    const btnH = 26;
    const btnX = width / 2;
    const btnY = 222;

    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, isInMultiplayer ? 0x16a34a : 0x2563eb);
    btnBg.setInteractive({ useHandCursor: true });

    const btnLabelText = isInMultiplayer ? '⚔️ RETORNAR AO LOBBY (SALA DE ESPERA)' : 'RETORNAR À BASE';
    const btnLabel = this.add.text(btnX, btnY, btnLabelText, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnBg.on('pointerover', () => {
      btnBg.fillColor = isInMultiplayer ? 0x22c55e : 0x3b82f6;
    });

    btnBg.on('pointerout', () => {
      btnBg.fillColor = isInMultiplayer ? 0x16a34a : 0x2563eb;
    });

    const handleReturn = () => {
      if (isInMultiplayer) {
        // Notifica o parceiro para voltarem juntos para o Lobby
        NetworkManager.sendAction({
          type: 'scene_sync',
          payload: { scene: 'LobbyScene' }
        });
        this.scene.start('LobbyScene');
      } else {
        this.scene.start('HubScene');
      }
    };

    btnBg.on('pointerdown', handleReturn);
    btnLabel.on('pointerdown', handleReturn);

    // Se receber sinal do parceiro para voltar ao Lobby, sincroniza a transição
    if (isInMultiplayer) {
      const unsubAction = NetworkManager.onAction((action: PlayerNetworkAction) => {
        if (action.type === 'scene_sync' && action.payload?.scene === 'LobbyScene') {
          this.scene.start('LobbyScene');
        }
      });

      this.events.once('shutdown', () => {
        unsubAction();
      });
    }
  }
}
