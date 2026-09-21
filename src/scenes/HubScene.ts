import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { ASSET_KEYS } from '../assets/AssetManifest';
import { GameState } from '../core/GameState';
import { ShopModal } from '../ui/ShopModal';
import { MultiplayerModal } from '../ui/MultiplayerModal';
import { Player } from '../entities/player/Player';
import { RemotePlayer } from '../entities/player/RemotePlayer';
import { NetworkManager } from '../network/NetworkManager';
import { PlayerNetworkState, PlayerNetworkAction } from '../network/NetworkTypes';

export class HubScene extends Phaser.Scene {
  private player!: Player;
  private shopNpc!: Phaser.GameObjects.Sprite;
  private portal!: Phaser.Physics.Arcade.Sprite;
  private p2pTotem!: Phaser.Physics.Arcade.Sprite;

  private shopModal!: ShopModal;
  private multiplayerModal!: MultiplayerModal;
  private isModalOpen: boolean = false;

  private npcPromptText?: Phaser.GameObjects.Text;
  private portalPromptText?: Phaser.GameObjects.Text;
  private p2pPromptText?: Phaser.GameObjects.Text;
  private goldDisplayText!: Phaser.GameObjects.Text;
  private p2pStatusText!: Phaser.GameObjects.Text;

  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private networkSyncTimer: number = 0;
  private arrowGroup!: Phaser.GameObjects.Group;
  private networkUnsubs: Array<() => void> = [];

  constructor() {
    super({ key: 'HubScene' });
  }

  public create() {
    const width = CONSTANTS.GAME_WIDTH;
    const height = CONSTANTS.GAME_HEIGHT;

    this.remotePlayers.clear();
    this.arrowGroup = this.add.group({ runChildUpdate: true });

    // Na base, o arsenal de flechas está sempre reabastecido para testes
    GameState.arrows = 30 + (GameState.upgrades.quiverLevel ?? 0) * 3;

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

    // 5. Totem / Cristal P2P Multiplayer (Acima da fogueira)
    this.p2pTotem = this.physics.add.sprite(width / 2, height / 2 - 50, ASSET_KEYS.ENVIRONMENT.PORTAL);
    this.p2pTotem.setDepth(CONSTANTS.DEPTH.DECORATION);
    this.p2pTotem.setTint(0x38bdf8);
    this.p2pTotem.setScale(0.85);
    this.tweens.add({
      targets: this.p2pTotem,
      rotation: -6.28,
      duration: 4000,
      repeat: -1
    });

    const p2pLabel = this.add.text(this.p2pTotem.x, this.p2pTotem.y - 18, 'Totem Multiplayer P2P', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#38bdf8',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    p2pLabel.setDepth(CONSTANTS.DEPTH.UI);

    // 6. Jogador na Base
    this.player = new Player(this, width / 2, height / 2 + 35);
    this.physics.add.collider(this.player, walls);

    // 7. Textos de HUD do Hub
    this.goldDisplayText = this.add.text(12, 10, `Ouro: ${GameState.bankedGold} G`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(CONSTANTS.DEPTH.UI);

    // Botão / Status P2P no canto superior direito
    this.p2pStatusText = this.add.text(width - 12, 10, '[ 🌐 SALA MULTIPLAYER ]', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#38bdf8',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0).setDepth(CONSTANTS.DEPTH.UI).setInteractive({ useHandCursor: true });

    this.p2pStatusText.on('pointerdown', () => {
      this.openMultiplayerModal();
    });

    // 8. Janelas Modais
    this.shopModal = new ShopModal(this);
    this.multiplayerModal = new MultiplayerModal(this);

    // Câmera do Hub
    this.cameras.main.setBackgroundColor('#0d0e15');

    // 9. Configuração de Rede P2P
    this.setupNetwork();

    // Auto-join se a URL possuir ?room=XXXX
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && !NetworkManager.currentRoomId) {
      NetworkManager.clearRoomUrl();
      NetworkManager.join(roomParam, false);
      this.scene.start('LobbyScene');
      return;
    }
  }

  private setupNetwork() {
    // Cria jogador remoto para peers já conectados
    NetworkManager.connectedPeers.forEach(peerId => {
      this.createRemotePlayer(peerId);
    });

    const unsubJoin = NetworkManager.onPeerJoin((peerId: string) => {
      this.createRemotePlayer(peerId);
      this.updateP2PStatusText();
    });
    this.networkUnsubs.push(unsubJoin);

    const unsubLeave = NetworkManager.onPeerLeave((peerId: string) => {
      const remote = this.remotePlayers.get(peerId);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(peerId);
      }
      this.updateP2PStatusText();
    });
    this.networkUnsubs.push(unsubLeave);

    const unsubState = NetworkManager.onState((state: PlayerNetworkState, peerId: string) => {
      if (state.scene && state.scene !== 'HubScene') {
        const remote = this.remotePlayers.get(peerId);
        if (remote) {
          remote.destroy();
          this.remotePlayers.delete(peerId);
        }
        return;
      }
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
      } else if (action.type === 'player_dash' && remote) {
        remote.remoteDash(action.payload?.dirX ?? 0, action.payload?.dirY ?? 0);
      } else if (action.type === 'scene_sync') {
        if (action.payload?.scene === 'DungeonScene') {
          this.startDungeonRun(false);
        } else if (action.payload?.scene === 'LobbyScene') {
          this.scene.start('LobbyScene');
        }
      }
    });
    this.networkUnsubs.push(unsubAction);

    const unsubRoom = NetworkManager.onRoomChange(() => {
      this.updateP2PStatusText();
    });
    this.networkUnsubs.push(unsubRoom);

    this.events.once('shutdown', () => {
      this.networkUnsubs.forEach(unsub => unsub());
      this.networkUnsubs = [];
    });

    this.updateP2PStatusText();
  }

  private createRemotePlayer(peerId: string): RemotePlayer {
    if (this.remotePlayers.has(peerId)) {
      return this.remotePlayers.get(peerId)!;
    }
    const remote = new RemotePlayer(this, this.player.x + 30, this.player.y, peerId);
    this.remotePlayers.set(peerId, remote);
    return remote;
  }

  private updateP2PStatusText() {
    if (!this.p2pStatusText || !this.p2pStatusText.active) return;
    if (NetworkManager.isConnected()) {
      this.p2pStatusText.setText(`[ 🟢 P2P: ${NetworkManager.currentRoomId} (2P) ]`);
      this.p2pStatusText.setColor('#22c55e');
    } else if (NetworkManager.currentRoomId) {
      this.p2pStatusText.setText(`[ 🟡 P2P: ${NetworkManager.currentRoomId} (Aguardando) ]`);
      this.p2pStatusText.setColor('#f59e0b');
    } else {
      this.p2pStatusText.setText('[ 🌐 SALA MULTIPLAYER ]');
      this.p2pStatusText.setColor('#38bdf8');
    }
  }

  public override update(time: number, delta: number) {
    if (this.isModalOpen) return;

    this.player.update(time, delta);
    this.player.handleActions(this.physics.add.group(), this.arrowGroup);
    this.goldDisplayText.setText(`Ouro: ${GameState.bankedGold} G`);
    this.updateP2PStatusText();

    // Sincronização de rede P2P a cada 40ms (25 FPS de taxa de atualização de rede)
    this.networkSyncTimer += delta;
    if (this.networkSyncTimer >= 40) {
      this.networkSyncTimer = 0;
      if (NetworkManager.isConnected()) {
        NetworkManager.sendState(this.player.getNetworkState('HubScene'));
      }
    }

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

    // 2. Proximidade com o Totem P2P Multiplayer
    const distP2P = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.p2pTotem.x, this.p2pTotem.y);
    if (distP2P < 28) {
      if (!this.p2pPromptText) {
        this.p2pPromptText = this.add.text(this.p2pTotem.x, this.p2pTotem.y + 16, '[E] Multiplayer P2P', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#38bdf8',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
      }

      if (this.player.controller.isInteractPressed()) {
        this.openMultiplayerModal();
      }
    } else if (this.p2pPromptText) {
      this.p2pPromptText.destroy();
      this.p2pPromptText = undefined;
    }

    // 3. Proximidade com o Portal da Masmorra
    const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
    if (distPortal < 28) {
      if (!this.portalPromptText) {
        const portalLabel = NetworkManager.currentRoomId ? '[E] Sala de Espera' : '[E] Descer Masmorra';
        this.portalPromptText = this.add.text(this.portal.x, this.portal.y + 18, portalLabel, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#a855f7',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
      }

      if (this.player.controller.isInteractPressed()) {
        if (NetworkManager.currentRoomId) {
          this.scene.start('LobbyScene');
        } else {
          this.startDungeonRun(true);
        }
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

  private openMultiplayerModal() {
    this.isModalOpen = true;
    this.player.setVelocity(0, 0);
    this.multiplayerModal.show(
      () => {
        this.isModalOpen = false;
        this.updateP2PStatusText();
      },
      () => {
        this.isModalOpen = false;
        this.startDungeonRun(true);
      }
    );
  }

  private startDungeonRun(isHostInitiator: boolean = true) {
    if (isHostInitiator && NetworkManager.isConnected()) {
      // Sincroniza a transição de cena com o outro jogador via WebRTC
      NetworkManager.sendAction({
        type: 'scene_sync',
        payload: { scene: 'DungeonScene' }
      });
    }

    GameState.startNewRun();
    this.scene.start('DungeonScene');
    this.scene.launch('UIScene');
  }
}
