import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { ASSET_KEYS } from '../assets/AssetManifest';
import { NetworkManager } from '../network/NetworkManager';
import { Player } from '../entities/player/Player';
import { RemotePlayer } from '../entities/player/RemotePlayer';
import { PlayerNetworkState, PlayerNetworkAction } from '../network/NetworkTypes';
import { AudioService } from '../systems/AudioService';
import { GameState } from '../core/GameState';

export class LobbyScene extends Phaser.Scene {
  private player!: Player;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private arrowGroup!: Phaser.Physics.Arcade.Group;
  private networkSyncTimer: number = 0;
  private networkUnsubs: Array<() => void> = [];

  // Estados de confirmação dos jogadores (Estilo Among Us / Impostor)
  private isSelfReady: boolean = false;
  private peerReadyMap: Map<string, boolean> = new Map();

  private uiContainer!: Phaser.GameObjects.Container;
  private hostStatusText!: Phaser.GameObjects.Text;
  private guestStatusText!: Phaser.GameObjects.Text;
  private actionButtonBg!: Phaser.GameObjects.Graphics;
  private actionButtonText!: Phaser.GameObjects.Text;
  private isCountingDown: boolean = false;
  private countdownText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  public create() {
    const width = CONSTANTS.GAME_WIDTH;
    const height = CONSTANTS.GAME_HEIGHT;

    this.remotePlayers.clear();
    this.peerReadyMap.clear();
    this.isSelfReady = NetworkManager.isHost; // Host começa marcado por padrão ou gerencia início
    this.isCountingDown = false;

    // Grupo de projéteis de flechas para treino na sala de espera
    this.arrowGroup = this.physics.add.group();

    // 1. Cenário da Sala de Espera (Antecâmara medieval com fogueira)
    const tileSize = CONSTANTS.TILE_SIZE;
    for (let x = 0; x < width; x += tileSize) {
      for (let y = 0; y < height; y += tileSize) {
        const floor = this.add.image(x + tileSize / 2, y + tileSize / 2, ASSET_KEYS.ENVIRONMENT.FLOOR);
        floor.setDepth(CONSTANTS.DEPTH.FLOOR);
      }
    }

    // Paredes de proteção da sala de espera
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

    // Fogueira animada no centro
    const campfire = this.add.sprite(width / 2, height / 2 - 10, ASSET_KEYS.ENVIRONMENT.CAMPFIRE);
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

    // Colisão das flechas com as paredes
    this.physics.add.collider(this.arrowGroup, walls, (arrowObj) => {
      arrowObj.destroy();
    });

    // 2. Spawn do Jogador Local
    const spawnX = NetworkManager.isHost ? width / 2 - 55 : width / 2 + 55;
    const spawnY = height / 2 + 30;
    this.player = new Player(this, spawnX, spawnY);
    this.physics.add.collider(this.player, walls);

    // 3. UI da Sala de Espera
    this.createLobbyUI();

    // 4. Configuração da Rede P2P
    this.setupLobbyNetwork();

    // Limpeza de ouvintes ao sair da cena
    this.events.once('shutdown', () => {
      this.networkUnsubs.forEach(unsub => unsub());
      this.networkUnsubs = [];
    });

    // Sincroniza estado inicial se aliado já estiver presente
    if (NetworkManager.isConnected()) {
      NetworkManager.sendAction({
        type: 'lobby_ready_toggle',
        payload: { ready: this.isSelfReady }
      });
    }
  }

  private createLobbyUI() {
    const width = CONSTANTS.GAME_WIDTH;
    const roomId = NetworkManager.currentRoomId || '----';

    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setDepth(CONSTANTS.DEPTH.UI + 50);

    // Barra superior
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0a0f1d, 0.94);
    headerBg.fillRect(0, 0, width, 40);
    headerBg.lineStyle(1, 0x0284c7, 0.8);
    headerBg.lineBetween(0, 40, width, 40);
    this.uiContainer.add(headerBg);

    // Título da Sala
    const title = this.add.text(14, 10, `SALA DE ESPERA [ ${roomId} ]`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#38bdf8',
      fontStyle: 'bold'
    });
    this.uiContainer.add(title);

    // Subtítulo
    const subTitle = this.add.text(14, 24, 'Todos devem confirmar antes de descer para a masmorra', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#94a3b8'
    });
    this.uiContainer.add(subTitle);

    // Botão Copiar ID
    const copyIdBtn = this.add.text(width - 125, 14, '🔑 ID', {
      fontFamily: 'monospace',
      fontSize: '7.5px',
      color: '#38bdf8',
      fontStyle: 'bold',
      backgroundColor: '#1e293b',
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    copyIdBtn.on('pointerdown', () => {
      navigator.clipboard?.writeText(roomId);
      copyIdBtn.setText('COPIADO!');
      this.time.delayedCall(1200, () => {
        if (copyIdBtn.active) copyIdBtn.setText('🔑 ID');
      });
    });
    this.uiContainer.add(copyIdBtn);

    // Botão Copiar Link
    const copyLinkBtn = this.add.text(width - 55, 14, '📋 LINK', {
      fontFamily: 'monospace',
      fontSize: '7.5px',
      color: '#fde047',
      fontStyle: 'bold',
      backgroundColor: '#1e293b',
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    copyLinkBtn.on('pointerdown', () => {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      navigator.clipboard?.writeText(url);
      copyLinkBtn.setText('COPIADO!');
      this.time.delayedCall(1200, () => {
        if (copyLinkBtn.active) copyLinkBtn.setText('📋 LINK');
      });
    });
    this.uiContainer.add(copyLinkBtn);

    // Card de Status dos Jogadores (Centro)
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0f172a, 0.90);
    cardBg.fillRoundedRect(width / 2 - 140, 46, 280, 44, 4);
    cardBg.lineStyle(1, 0x334155, 1);
    cardBg.strokeRoundedRect(width / 2 - 140, 46, 280, 44, 4);
    this.uiContainer.add(cardBg);

    this.hostStatusText = this.add.text(width / 2 - 130, 54, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#f8fafc'
    });
    this.uiContainer.add(this.hostStatusText);

    this.guestStatusText = this.add.text(width / 2 - 130, 70, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#f8fafc'
    });
    this.uiContainer.add(this.guestStatusText);

    // Dica de treino / controles no rodapé
    const controlsTip = this.add.text(width / 2, 208, 'Teste seus ataques aqui: [ESPAÇO] Espada | [J ou F] Besta | [C ou K] Escudo', {
      fontFamily: 'monospace',
      fontSize: '6.5px',
      color: '#64748b'
    }).setOrigin(0.5);
    this.uiContainer.add(controlsTip);

    // Botão de Ação Inferior (Pronto / Iniciar)
    this.actionButtonBg = this.add.graphics();
    this.uiContainer.add(this.actionButtonBg);

    this.actionButtonText = this.add.text(width / 2, 237, '', {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.uiContainer.add(this.actionButtonText);

    // Botão Sair da Sala
    const leaveBtn = this.add.text(45, 237, '[ 🚪 SAIR ]', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#f43f5e',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    leaveBtn.on('pointerdown', () => {
      NetworkManager.leave();
      this.scene.start('HubScene');
    });
    this.uiContainer.add(leaveBtn);

    this.refreshLobbyStateUI();
  }

  private setupLobbyNetwork() {
    // Peers existentes
    NetworkManager.connectedPeers.forEach(peerId => {
      this.createRemotePlayer(peerId);
    });

    const unsubJoin = NetworkManager.onPeerJoin((peerId: string) => {
      this.createRemotePlayer(peerId);
      AudioService.playBuyUpgrade();
      // Envia nosso status atual para o parceiro recém-chegado
      NetworkManager.sendAction({
        type: 'lobby_ready_toggle',
        payload: { ready: this.isSelfReady }
      });
      this.refreshLobbyStateUI();
    });
    this.networkUnsubs.push(unsubJoin);

    const unsubLeave = NetworkManager.onPeerLeave((peerId: string) => {
      const remote = this.remotePlayers.get(peerId);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(peerId);
      }
      this.peerReadyMap.delete(peerId);
      this.refreshLobbyStateUI();
    });
    this.networkUnsubs.push(unsubLeave);

    const unsubState = NetworkManager.onState((state: PlayerNetworkState, peerId: string) => {
      let remote = this.remotePlayers.get(peerId);
      if (!remote) {
        remote = this.createRemotePlayer(peerId);
      }
      remote.applyNetworkState(state);
    });
    this.networkUnsubs.push(unsubState);

    const unsubAction = NetworkManager.onAction((action: PlayerNetworkAction, peerId: string) => {
      const remote = this.remotePlayers.get(peerId);

      if (action.type === 'shoot_arrow' && remote) {
        remote.remoteShootArrow(this.arrowGroup, action.payload.targetX, action.payload.targetY);
      } else if (action.type === 'melee_attack' && remote) {
        remote.remoteMeleeAttack();
      } else if (action.type === 'lobby_ready_toggle') {
        const isReady = !!action.payload?.ready;
        this.peerReadyMap.set(peerId, isReady);
        AudioService.playShieldBlock();
        this.refreshLobbyStateUI();
      } else if (action.type === 'lobby_start_countdown') {
        this.startCountdownSequence();
      }
    });
    this.networkUnsubs.push(unsubAction);
  }

  private createRemotePlayer(peerId: string): RemotePlayer {
    if (this.remotePlayers.has(peerId)) {
      return this.remotePlayers.get(peerId)!;
    }
    const spawnX = NetworkManager.isHost ? CONSTANTS.GAME_WIDTH / 2 + 55 : CONSTANTS.GAME_WIDTH / 2 - 55;
    const remote = new RemotePlayer(this, spawnX, CONSTANTS.GAME_HEIGHT / 2 + 30, peerId);
    this.remotePlayers.set(peerId, remote);
    return remote;
  }

  private refreshLobbyStateUI() {
    if (this.isCountingDown) return;

    const width = CONSTANTS.GAME_WIDTH;
    const isHost = NetworkManager.isHost;
    const isConnected = NetworkManager.isConnected();

    // 1. Atualizar linhas de status
    if (isHost) {
      this.hostStatusText.setText(`👑 Você (Líder da Sala): ${this.isSelfReady ? '🟢 PRONTO' : '🟡 AGUARDANDO'}`);
      if (isConnected) {
        const peerId = Array.from(NetworkManager.connectedPeers)[0];
        const isPeerReady = this.peerReadyMap.get(peerId) ?? false;
        this.guestStatusText.setText(`⚔️ Aliado: ${isPeerReady ? '🟢 PRONTO PARA A BATALHA!' : '⏳ AGUARDANDO CONFIRMAÇÃO...'}`);
      } else {
        this.guestStatusText.setText('⚔️ Aliado: ⏳ AGUARDANDO JOGADOR ENTRAR...');
      }
    } else {
      this.hostStatusText.setText(`👑 Líder da Sala (Host): 🟢 SALA ABERTA`);
      this.guestStatusText.setText(`⚔️ Você (Convidado): ${this.isSelfReady ? '🟢 ESTOU PRONTO!' : '⏳ CLIQUE ABAIXO PARA CONFIRMAR'}`);
    }

    // 2. Atualizar Botão de Ação
    this.actionButtonBg.clear();
    this.actionButtonBg.removeInteractive();

    const btnW = 210;
    const btnH = 26;
    const btnX = width / 2 - btnW / 2;
    const btnY = 224;

    if (isHost) {
      const allReady = isConnected ? Array.from(NetworkManager.connectedPeers).every(p => this.peerReadyMap.get(p) === true) : true;
      const canStart = allReady && this.isSelfReady;

      const color = canStart ? 0x16a34a : 0x475569;
      this.actionButtonBg.fillStyle(color, 1);
      this.actionButtonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 4);

      if (canStart) {
        this.actionButtonText.setText(isConnected ? '⚔️ INICIAR MASMORRA (TODOS PRONTOS)' : '⚔️ INICIAR MASMORRA (SOLO)');
        this.actionButtonBg.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
        this.actionButtonBg.once('pointerdown', () => {
          this.triggerStartMatch();
        });
      } else {
        this.actionButtonText.setText('⏳ AGUARDANDO ALIADO CONFIRMAR...');
      }
    } else {
      // Jogador Convidado (Botão de Pronto / Desmarcar)
      const color = this.isSelfReady ? 0x991b1b : 0x059669;
      this.actionButtonBg.fillStyle(color, 1);
      this.actionButtonBg.fillRoundedRect(btnX, btnY, btnW, btnH, 4);

      this.actionButtonText.setText(this.isSelfReady ? '❌ CANCELAR CONFIRMAÇÃO' : '✅ ESTOU PRONTO!');
      this.actionButtonBg.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
      this.actionButtonBg.once('pointerdown', () => {
        this.isSelfReady = !this.isSelfReady;
        AudioService.playBuyUpgrade();
        NetworkManager.sendAction({
          type: 'lobby_ready_toggle',
          payload: { ready: this.isSelfReady }
        });
        this.refreshLobbyStateUI();
      });
    }
  }

  private triggerStartMatch() {
    // Host dispara início sincronizado para todos os peers conectados
    NetworkManager.sendAction({
      type: 'lobby_start_countdown'
    });
    this.startCountdownSequence();
  }

  private startCountdownSequence() {
    if (this.isCountingDown) return;
    this.isCountingDown = true;

    let secondsLeft = 3;

    // Overlay escuro com texto de contagem estilo contagem regressiva
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.78);
    overlay.fillRect(0, 0, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT);
    overlay.setDepth(CONSTANTS.DEPTH.MODAL + 10);

    this.countdownText = this.add.text(
      CONSTANTS.GAME_WIDTH / 2,
      CONSTANTS.GAME_HEIGHT / 2,
      `COMEÇANDO EM ${secondsLeft}...`,
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#facc15',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.MODAL + 20);

    AudioService.playBuyUpgrade();

    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        secondsLeft--;
        if (secondsLeft > 0) {
          AudioService.playBuyUpgrade();
          this.countdownText?.setText(`COMEÇANDO EM ${secondsLeft}...`);
        } else {
          this.countdownText?.setText('⚔️ ENTRANDO NA MASMORRA!');
          AudioService.playDash();
          this.time.delayedCall(400, () => {
            GameState.startNewRun();
            this.scene.start('DungeonScene');
            this.scene.launch('UIScene');
          });
        }
      }
    });
  }

  public override update(time: number, delta: number) {
    this.player.update(time, delta);
    this.player.handleActions(this.physics.add.group(), this.arrowGroup);

    // Atualiza interpolação e animações dos jogadores remotos
    this.remotePlayers.forEach(remote => {
      remote.update(time, delta);
    });

    // Sincronização P2P das posições na sala de espera
    this.networkSyncTimer += delta;
    if (this.networkSyncTimer >= 40) {
      this.networkSyncTimer = 0;
      if (NetworkManager.isConnected()) {
        NetworkManager.sendState(this.player.getNetworkState());
      }
    }
  }
}
