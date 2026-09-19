import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { NetworkManager } from '../network/NetworkManager';

export class MultiplayerModal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;
  private bgContainer: Phaser.GameObjects.Container;
  private contentGraphics: Phaser.GameObjects.Graphics;
  private onCloseCallback?: () => void;
  private onStartGameCallback?: () => void;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.setDepth(CONSTANTS.DEPTH.MODAL + 10);

    // Overlay escuro de fundo
    this.overlay = scene.add.rectangle(
      CONSTANTS.GAME_WIDTH / 2,
      CONSTANTS.GAME_HEIGHT / 2,
      CONSTANTS.GAME_WIDTH,
      CONSTANTS.GAME_HEIGHT,
      0x000000,
      0.84
    );
    this.overlay.setInteractive();
    this.add(this.overlay);

    this.bgContainer = scene.add.container(0, 0);
    this.contentGraphics = scene.add.graphics();
    this.bgContainer.add(this.contentGraphics);
    this.add(this.bgContainer);

    this.setVisible(false);
    scene.add.existing(this);

    // Ouvintes de rede para atualizar a interface em tempo real
    NetworkManager.onPeerJoin(() => {
      if (this.visible) this.renderContent();
    });
    NetworkManager.onPeerLeave(() => {
      if (this.visible) this.renderContent();
    });
  }

  public show(onClose?: () => void, onStartGame?: () => void) {
    this.onCloseCallback = onClose;
    this.onStartGameCallback = onStartGame;
    this.setVisible(true);
    this.renderContent();
  }

  public hide() {
    this.setVisible(false);
    this.clearDynamicElements();
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  private clearDynamicElements() {
    const toRemove: Phaser.GameObjects.GameObject[] = [];
    this.bgContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (child !== this.contentGraphics) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(c => c.destroy());
    this.contentGraphics.clear();
  }

  private renderContent() {
    this.clearDynamicElements();

    const cx = CONSTANTS.GAME_WIDTH / 2;
    const cy = CONSTANTS.GAME_HEIGHT / 2;
    const boxW = 280;
    const boxH = 190;
    const bx = cx - boxW / 2;
    const by = cy - boxH / 2;

    // Fundo do painel modal com estilo pixel art sci-fi/fantasia
    this.contentGraphics.fillStyle(0x0a0f1d, 0.98);
    this.contentGraphics.fillRoundedRect(bx, by, boxW, boxH, 6);
    this.contentGraphics.lineStyle(2, 0x0284c7, 1);
    this.contentGraphics.strokeRoundedRect(bx, by, boxW, boxH, 6);

    // Divisória do cabeçalho
    this.contentGraphics.lineStyle(1, 0x1e293b, 1);
    this.contentGraphics.lineBetween(bx + 10, by + 26, bx + boxW - 10, by + 26);

    // Título Principal
    const title = this.scene.add.text(cx, by + 14, 'SALA COOPERATIVA P2P (WEBRTC)', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.bgContainer.add(title);

    const isConnected = NetworkManager.isConnected();
    const currentRoom = NetworkManager.currentRoomId;

    if (currentRoom) {
      // ESTADO 1: DENTRO DE UMA SALA (LOBBY ATIVO)
      const statusColor = isConnected ? '#22c55e' : '#f59e0b';
      const statusIcon = isConnected ? '●' : '○';
      const statusMsg = isConnected
        ? `${statusIcon} ALIADO CONECTADO! PRONTOS PARA LUTAR`
        : `${statusIcon} AGUARDANDO JOGADOR ENTRAR NO ID...`;

      const statusText = this.scene.add.text(cx, by + 36, statusMsg, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: statusColor
      }).setOrigin(0.5);
      this.bgContainer.add(statusText);

      // Caixa de exibição do ID da Sala
      this.contentGraphics.fillStyle(0x1e293b, 1);
      this.contentGraphics.fillRoundedRect(cx - 75, by + 46, 150, 24, 4);
      this.contentGraphics.lineStyle(1, 0x38bdf8, 0.8);
      this.contentGraphics.strokeRoundedRect(cx - 75, by + 46, 150, 24, 4);

      const codeLabel = this.scene.add.text(cx, by + 58, `ID: ${currentRoom}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f8fafc',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.bgContainer.add(codeLabel);

      // Botão 1: Copiar Apenas o Código ID
      const copyCodeBg = this.scene.add.graphics();
      copyCodeBg.fillStyle(0x0369a1, 1);
      copyCodeBg.fillRoundedRect(cx - 105, by + 76, 100, 18, 3);
      this.bgContainer.add(copyCodeBg);

      const copyCodeBtn = this.scene.add.text(cx - 55, by + 85, '📋 COPIAR ID', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      copyCodeBtn.on('pointerdown', () => {
        navigator.clipboard?.writeText(currentRoom);
        copyCodeBtn.setText('ID COPIADO!');
        this.scene.time.delayedCall(1200, () => {
          if (copyCodeBtn.active) copyCodeBtn.setText('📋 COPIAR ID');
        });
      });
      this.bgContainer.add(copyCodeBtn);

      // Botão 2: Copiar Link Completo de Convite
      const copyLinkBg = this.scene.add.graphics();
      copyLinkBg.fillStyle(0x0284c7, 1);
      copyLinkBg.fillRoundedRect(cx + 5, by + 76, 100, 18, 3);
      this.bgContainer.add(copyLinkBg);

      const copyLinkBtn = this.scene.add.text(cx + 55, by + 85, '🔗 COPIAR LINK', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      copyLinkBtn.on('pointerdown', () => {
        const url = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
        navigator.clipboard?.writeText(url);
        copyLinkBtn.setText('LINK COPIADO!');
        this.scene.time.delayedCall(1200, () => {
          if (copyLinkBtn.active) copyLinkBtn.setText('🔗 COPIAR LINK');
        });
      });
      this.bgContainer.add(copyLinkBtn);

      // Lista de Membros da Sala
      const rosterText = isConnected
        ? 'Equipe: 👑 Você (Host) + ⚔️ Aliado P2P'
        : 'Equipe: 👑 Você (Host) | (Vaga Aberta)';
      const rosterLabel = this.scene.add.text(cx, by + 104, rosterText, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#94a3b8'
      }).setOrigin(0.5);
      this.bgContainer.add(rosterLabel);

      // Se for o Host: Botão "INICIAR PARTIDA EM EQUIPE"
      const startRunBg = this.scene.add.graphics();
      startRunBg.fillStyle(0x16a34a, 1);
      startRunBg.fillRoundedRect(cx - 85, by + 116, 170, 22, 4);
      this.bgContainer.add(startRunBg);

      const startRunBtn = this.scene.add.text(cx, by + 127, '⚔️ INICIAR MASMORRA EM DUPLA', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      startRunBtn.on('pointerdown', () => {
        this.hide();
        if (this.onStartGameCallback) {
          this.onStartGameCallback();
        }
      });
      this.bgContainer.add(startRunBtn);

      // Botão Sair da Sala
      const leaveBtn = this.scene.add.text(cx, by + 150, '[ SAIR DA SALA ]', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#f43f5e'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      leaveBtn.on('pointerdown', () => {
        NetworkManager.leave();
        this.renderContent();
      });
      this.bgContainer.add(leaveBtn);

    } else {
      // ESTADO 2: FORA DA SALA (MENU INICIAL DE CRIAÇÃO E CONEXÃO)
      const subTitle = this.scene.add.text(cx, by + 38, 'Crie um ID de sala ou conecte-se ao ID de um amigo', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#94a3b8'
      }).setOrigin(0.5);
      this.bgContainer.add(subTitle);

      // OPÇÃO 1: CRIAR NOVA SALA
      const createBg = this.scene.add.graphics();
      createBg.fillStyle(0x0284c7, 1);
      createBg.fillRoundedRect(cx - 90, by + 54, 180, 26, 4);
      this.bgContainer.add(createBg);

      const createBtn = this.scene.add.text(cx, by + 67, '⚡ CRIAR SALA (GERAR ID)', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      createBtn.on('pointerdown', () => {
        // Gera um ID de 4 dígitos limpo e fácil de compartilhar
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const roomId = `MDB-${randomNum}`;
        NetworkManager.join(roomId, true);
        this.renderContent();
      });
      this.bgContainer.add(createBtn);

      // OPÇÃO 2: DIGITAR ID DE UMA SALA EXISTENTE
      const joinLabel = this.scene.add.text(cx, by + 94, 'Já tem um ID ou convite?', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#cbd5e1'
      }).setOrigin(0.5);
      this.bgContainer.add(joinLabel);

      const joinBg = this.scene.add.graphics();
      joinBg.fillStyle(0x1e293b, 1);
      joinBg.fillRoundedRect(cx - 90, by + 106, 180, 24, 4);
      joinBg.lineStyle(1, 0x475569, 1);
      joinBg.strokeRoundedRect(cx - 90, by + 106, 180, 24, 4);
      this.bgContainer.add(joinBg);

      const joinBtn = this.scene.add.text(cx, by + 118, '🔑 CONECTAR COM ID DA SALA', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#38bdf8',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      joinBtn.on('pointerdown', () => {
        const inputCode = window.prompt('Digite ou cole o ID da Sala (Ex: MDB-1234):');
        if (inputCode && inputCode.trim().length > 0) {
          NetworkManager.join(inputCode.trim().toUpperCase(), false);
          this.renderContent();
        }
      });
      this.bgContainer.add(joinBtn);
    }

    // Botão de Fechar
    const closeBtn = this.scene.add.text(cx, by + boxH - 12, '[ X FECHAR ]', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#94a3b8'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.hide();
    });
    this.bgContainer.add(closeBtn);
  }
}
