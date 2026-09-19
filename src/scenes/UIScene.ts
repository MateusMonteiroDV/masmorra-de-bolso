import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { ASSET_KEYS } from '../assets/AssetManifest';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { RelicSelectModal } from '../ui/RelicSelectModal';
import { NetworkManager } from '../network/NetworkManager';

export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private hpText?: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private p2pBadgeText?: Phaser.GameObjects.Text;
  private relicModal!: RelicSelectModal;
  private relicIconsContainer!: Phaser.GameObjects.Container;
  private notificationText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  public create() {
    this.hpText = undefined;
    this.hearts = [];

    // 1. HUD Superior Esquerdo: Indicador de 10 HP
    this.createHeartsUI();

    // 2. HUD Superior Direito: Contador de Moedas
    const coinIcon = this.add.sprite(CONSTANTS.GAME_WIDTH - 85, 14, 'moeda_0');
    coinIcon.setScale(0.55);
    coinIcon.play('anim_moeda');

    this.goldText = this.add.text(CONSTANTS.GAME_WIDTH - 72, 9, `0 G`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 2
    });

    // Indicador P2P no topo central da tela
    if (NetworkManager.isConnected()) {
      this.p2pBadgeText = this.add.text(CONSTANTS.GAME_WIDTH / 2, 12, `● P2P: ${NetworkManager.currentRoomId} (2P)`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#22c55e',
        stroke: '#052e16',
        strokeThickness: 2
      }).setOrigin(0.5);
    }

    // 3. Guia de Teclas no Rodapé da Tela
    this.add.text(
      CONSTANTS.GAME_WIDTH / 2,
      CONSTANTS.GAME_HEIGHT - 8,
      '[WASD] Mover | [Espaço] Espada | [Clique/F/J] Besta | [Shift/Q] Defesa',
      {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#94a3b8',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);

    // 4. Barra Central: Ícones de Relíquias Ativas
    this.relicIconsContainer = this.add.container(CONSTANTS.GAME_WIDTH / 2, CONSTANTS.GAME_HEIGHT - 22);

    // 5. Banner de Notificação
    this.notificationText = this.add.text(CONSTANTS.GAME_WIDTH / 2, 60, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ef4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0);

    // 6. Modal de Relíquias
    this.relicModal = new RelicSelectModal(this);

    this.setupEventListeners();
  }

  private createHeartsUI() {
    this.hearts.forEach(h => {
      if (h && h.active) h.destroy();
    });
    this.hearts = [];

    const stats = GameState.getComputedPlayerStats();
    const startX = 14;
    const startY = 14;
    const spacing = 11;

    for (let i = 0; i < stats.maxHp; i++) {
      const heart = this.add.image(startX + i * spacing, startY, ASSET_KEYS.UI.HEART_FULL);
      heart.setScale(0.9);
      this.hearts.push(heart);
    }

    if (this.hpText && this.hpText.active) {
      this.hpText.destroy();
    }

    this.hpText = this.add.text(startX + stats.maxHp * spacing + 6, startY - 5, `${stats.currentHp}/${stats.maxHp} HP`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#f87171',
      stroke: '#000000',
      strokeThickness: 2
    });
  }

  private updateHearts(current: number, max: number) {
    if (this.hearts.length !== max) {
      this.createHeartsUI();
    }

    for (let i = 0; i < this.hearts.length; i++) {
      if (this.hearts[i] && this.hearts[i].active) {
        if (i < current) {
          this.hearts[i].setTexture(ASSET_KEYS.UI.HEART_FULL);
        } else {
          this.hearts[i].setTexture(ASSET_KEYS.UI.HEART_EMPTY);
        }
      }
    }

    if (this.hpText && this.hpText.active) {
      this.hpText.setText(`${current}/${max} HP`);
    }
  }

  private setupEventListeners() {
    EventBus.on(CONSTANTS.EVENTS.PLAYER_HEALTH_CHANGED, (data: { current: number; max: number }) => {
      this.updateHearts(data.current, data.max);
    });

    EventBus.on(CONSTANTS.EVENTS.PLAYER_GOLD_CHANGED, (gold: number) => {
      this.goldText.setText(`${gold} G`);
    });

    EventBus.on(CONSTANTS.EVENTS.RELIC_ACQUIRED, () => {
      this.refreshRelicsBar();
    });

    EventBus.on(CONSTANTS.EVENTS.REQUEST_RELIC_CHOICE, () => {
      this.scene.pause('DungeonScene');
      this.relicModal.show(() => {
        this.scene.resume('DungeonScene');
        this.refreshRelicsBar();
      });
    });

    NetworkManager.onPeerJoin(() => {
      if (!this.p2pBadgeText || !this.p2pBadgeText.active) {
        this.p2pBadgeText = this.add.text(CONSTANTS.GAME_WIDTH / 2, 12, `● P2P: ${NetworkManager.currentRoomId} (2P)`, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#22c55e',
          stroke: '#052e16',
          strokeThickness: 2
        }).setOrigin(0.5);
      }
    });

    NetworkManager.onPeerLeave(() => {
      if (this.p2pBadgeText && this.p2pBadgeText.active) {
        this.p2pBadgeText.destroy();
        this.p2pBadgeText = undefined;
      }
    });

    this.events.on('shutdown', () => {
      EventBus.off(CONSTANTS.EVENTS.PLAYER_HEALTH_CHANGED);
      EventBus.off(CONSTANTS.EVENTS.PLAYER_GOLD_CHANGED);
      EventBus.off(CONSTANTS.EVENTS.RELIC_ACQUIRED);
      EventBus.off(CONSTANTS.EVENTS.REQUEST_RELIC_CHOICE);
    });
  }

  private refreshRelicsBar() {
    this.relicIconsContainer.removeAll(true);
    const relics = GameState.activeRelics;
    const spacing = 16;
    const startX = -((relics.length - 1) * spacing) / 2;

    relics.forEach((r, idx) => {
      const icon = this.add.image(startX + idx * spacing, 0, r.icon);
      this.relicIconsContainer.add(icon);
    });
  }
}
