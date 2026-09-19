import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { NetworkManager } from '../network/NetworkManager';

export class MultiplayerModal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;
  private bgContainer: Phaser.GameObjects.Container;
  private contentGraphics: Phaser.GameObjects.Graphics;
  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.setDepth(CONSTANTS.DEPTH.MODAL + 10);

    // Overlay escuro
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

  public show(onClose?: () => void) {
    this.onCloseCallback = onClose;
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
    const boxW = 270;
    const boxH = 175;
    const bx = cx - boxW / 2;
    const by = cy - boxH / 2;

    // Fundo do painel modal com cantos e borda ciano/azul
    this.contentGraphics.fillStyle(0x0f172a, 0.96);
    this.contentGraphics.fillRoundedRect(bx, by, boxW, boxH, 6);
    this.contentGraphics.lineStyle(2, 0x0284c7, 1);
    this.contentGraphics.strokeRoundedRect(bx, by, boxW, boxH, 6);

    // Linha divisória de cabeçalho
    this.contentGraphics.lineStyle(1, 0x1e293b, 1);
    this.contentGraphics.lineBetween(bx + 12, by + 28, bx + boxW - 12, by + 28);

    // Título do Modal
    const title = this.scene.add.text(cx, by + 15, 'MULTIPLAYER P2P (WEBRTC)', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.bgContainer.add(title);

    const isConnected = NetworkManager.isConnected();
    const currentRoom = NetworkManager.currentRoomId;

    if (currentRoom) {
      // Estado 1: Dentro de uma Sala
      const statusColor = isConnected ? '#22c55e' : '#f59e0b';
      const statusDot = isConnected ? '●' : '○';
      const statusText = isConnected
        ? `${statusDot} CONECTADO COM 1 ALIADO!`
        : `${statusDot} AGUARDANDO JOGADOR ENTRAR...`;

      const statusLabel = this.scene.add.text(cx, by + 40, statusText, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: statusColor
      }).setOrigin(0.5);
      this.bgContainer.add(statusLabel);

      // Caixa de exibição do Código da Sala
      this.contentGraphics.fillStyle(0x1e293b, 1);
      this.contentGraphics.fillRoundedRect(cx - 70, by + 52, 140, 24, 4);
      this.contentGraphics.lineStyle(1, 0x38bdf8, 0.8);
      this.contentGraphics.strokeRoundedRect(cx - 70, by + 52, 140, 24, 4);

      const codeText = this.scene.add.text(cx, by + 64, currentRoom, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f8fafc',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.bgContainer.add(codeText);

      // Botão Copiar Código / Link
      const copyBtnBg = this.scene.add.graphics();
      copyBtnBg.fillStyle(0x0284c7, 1);
      copyBtnBg.fillRoundedRect(cx - 60, by + 84, 120, 18, 3);
      this.bgContainer.add(copyBtnBg);

      const copyBtn = this.scene.add.text(cx, by + 93, 'COPIAR LINK DA SALA', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      copyBtn.on('pointerdown', () => {
        const url = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
        navigator.clipboard?.writeText(url);
        copyBtn.setText('LINK COPIADO!');
        this.scene.time.delayedCall(1500, () => {
          if (copyBtn.active) copyBtn.setText('COPIAR LINK DA SALA');
        });
      });
      this.bgContainer.add(copyBtn);

      // Botão Desconectar / Sair da Sala
      const leaveBtn = this.scene.add.text(cx, by + 120, '[ SAIR DA SALA ]', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#f43f5e'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      leaveBtn.on('pointerdown', () => {
        NetworkManager.leave();
        this.renderContent();
      });
      this.bgContainer.add(leaveBtn);

    } else {
      // Estado 2: Fora de uma Sala (Opções Criar / Entrar)
      const subTitle = this.scene.add.text(cx, by + 38, 'Jogue em dupla cooperativa sem servidor central!', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#94a3b8'
      }).setOrigin(0.5);
      this.bgContainer.add(subTitle);

      // Opção A: CRIAR SALA
      const createBg = this.scene.add.graphics();
      createBg.fillStyle(0x0284c7, 1);
      createBg.fillRoundedRect(cx - 80, by + 52, 160, 22, 4);
      this.bgContainer.add(createBg);

      const createBtn = this.scene.add.text(cx, by + 63, '⚡ CRIAR NOVA SALA', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      createBtn.on('pointerdown', () => {
        const randomCode = 'MDB-' + Math.floor(1000 + Math.random() * 9000);
        NetworkManager.join(randomCode, true);
        this.renderContent();
      });
      this.bgContainer.add(createBtn);

      // Opção B: ENTRAR EM SALA COM CÓDIGO
      const joinLabel = this.scene.add.text(cx, by + 86, 'Ou digite o código de um amigo:', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#cbd5e1'
      }).setOrigin(0.5);
      this.bgContainer.add(joinLabel);

      const joinBg = this.scene.add.graphics();
      joinBg.fillStyle(0x1e293b, 1);
      joinBg.fillRoundedRect(cx - 80, by + 98, 160, 22, 4);
      joinBg.lineStyle(1, 0x475569, 1);
      joinBg.strokeRoundedRect(cx - 80, by + 98, 160, 22, 4);
      this.bgContainer.add(joinBg);

      const joinBtn = this.scene.add.text(cx, by + 109, '🔑 DIGITAR CÓDIGO DA SALA', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#38bdf8',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      joinBtn.on('pointerdown', () => {
        const inputCode = window.prompt('Digite o Código da Sala (Ex: MDB-1234):');
        if (inputCode && inputCode.trim().length > 0) {
          NetworkManager.join(inputCode.trim(), false);
          this.renderContent();
        }
      });
      this.bgContainer.add(joinBtn);
    }

    // Botão de Fechar
    const closeBtn = this.scene.add.text(cx, by + boxH - 14, '[ X FECHAR ]', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#94a3b8'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.hide();
    });
    this.bgContainer.add(closeBtn);
  }
}
