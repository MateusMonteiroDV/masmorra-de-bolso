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
  private arrowText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private p2pBadgeText?: Phaser.GameObjects.Text;
  private relicModal!: RelicSelectModal;
  private relicIconsContainer!: Phaser.GameObjects.Container;
  private notificationText!: Phaser.GameObjects.Text;
  private spectatorContainer?: Phaser.GameObjects.Container;
  private spectatorKeyEnter?: Phaser.Input.Keyboard.Key;
  private spectatorKeySpace?: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'UIScene' });
  }

  public create() {
    this.hpText = undefined;
    this.hearts = [];

    // 1. HUD Superior Esquerdo: Indicador de HP dos Corações
    this.createHeartsUI();

    // 2. Indicador de Onda Atual
    this.waveText = this.add.text(14, 25, 'ONDA 1/4', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#c084fc',
      stroke: '#000000',
      strokeThickness: 2
    });

    // 3. HUD Superior Direito: Contador de Flechas (Quiver)
    const arrowIcon = this.add.image(CONSTANTS.GAME_WIDTH - 142, 14, 'arrow_sprite');
    arrowIcon.setScale(0.75);
    arrowIcon.setRotation(-Math.PI / 4);

    this.arrowText = this.add.text(CONSTANTS.GAME_WIDTH - 132, 9, `${GameState.arrows}`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#38bdf8',
      stroke: '#000000',
      strokeThickness: 2
    });

    // 4. HUD Superior Direito: Contador de Ouro
    const coinIcon = this.add.sprite(CONSTANTS.GAME_WIDTH - 85, 14, 'moeda_0');
    coinIcon.setScale(0.55);
    coinIcon.play('anim_moeda');

    this.goldText = this.add.text(CONSTANTS.GAME_WIDTH - 72, 9, `${GameState.runGold} G`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 2
    });

    // 5. Indicador P2P no topo central da tela
    if (NetworkManager.isConnected()) {
      this.p2pBadgeText = this.add.text(CONSTANTS.GAME_WIDTH / 2, 12, `● P2P: ${NetworkManager.currentRoomId} (2P)`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#22c55e',
        stroke: '#052e16',
        strokeThickness: 2
      }).setOrigin(0.5);
    }

    // 6. Guia de Teclas no Rodapé da Tela
    this.add.text(
      CONSTANTS.GAME_WIDTH / 2,
      CONSTANTS.GAME_HEIGHT - 8,
      '[WASD / Setas] Mover | [Espaço/K] Espada | [Clique/F/J] Besta | [Shift/Q/Botão Direito] Escudo',
      {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#94a3b8',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);

    // 7. Barra Central: Ícones de Relíquias Ativas
    this.relicIconsContainer = this.add.container(CONSTANTS.GAME_WIDTH / 2, CONSTANTS.GAME_HEIGHT - 22);

    // 8. Banner de Notificação
    this.notificationText = this.add.text(CONSTANTS.GAME_WIDTH / 2, 60, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ef4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0);

    // 9. Modal de Relíquias
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

    EventBus.on(CONSTANTS.EVENTS.PLAYER_ARROWS_CHANGED, (count: number) => {
      if (this.arrowText && this.arrowText.active) {
        this.arrowText.setText(`${count}`);
        this.arrowText.setColor(count <= 3 ? '#f43f5e' : '#38bdf8');
      }
    });

    EventBus.on(CONSTANTS.EVENTS.WAVE_CHANGED, (data: { wave: number; total: number; remaining: number }) => {
      if (this.waveText && this.waveText.active) {
        this.waveText.setText(`ONDA ${data.wave}/${data.total} [${data.remaining} restantes]`);
      }
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
      this.cleanupSpectatorMode();
      EventBus.off(CONSTANTS.EVENTS.PLAYER_HEALTH_CHANGED);
      EventBus.off(CONSTANTS.EVENTS.PLAYER_GOLD_CHANGED);
      EventBus.off(CONSTANTS.EVENTS.PLAYER_ARROWS_CHANGED);
      EventBus.off(CONSTANTS.EVENTS.WAVE_CHANGED);
      EventBus.off(CONSTANTS.EVENTS.RELIC_ACQUIRED);
      EventBus.off(CONSTANTS.EVENTS.REQUEST_RELIC_CHOICE);
    });
  }

  public showSpectatorMode(onReturnToLobby: () => void) {
    if (this.spectatorContainer) return;

    this.spectatorContainer = this.add.container(0, 0);
    this.spectatorContainer.setDepth(CONSTANTS.DEPTH.UI + 80);

    // Banner piscante no topo anunciando observação de aliado
    const banner = this.add.text(
      CONSTANTS.GAME_WIDTH / 2,
      36,
      'VOCÊ CAIU! OBSERVANDO SEU ALIADO...',
      {
        fontFamily: 'monospace',
        fontSize: '8.5px',
        color: '#f43f5e',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: banner,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1
    });
    this.spectatorContainer.add(banner);

    // Botão de retorno ao Lobby no rodapé com clique amplo e feedback
    const btnW = 220;
    const btnH = 22;
    const btnX = CONSTANTS.GAME_WIDTH / 2;
    const btnY = CONSTANTS.GAME_HEIGHT - 22;

    const btnBg = this.add.rectangle(0, 0, btnW, btnH, 0x0f172a, 0.95);
    btnBg.setStrokeStyle(1.5, 0x38bdf8);
    btnBg.setInteractive({ useHandCursor: true });

    const btnLabel = this.add.text(0, 0, '⚔️ RETORNAR AO LOBBY [ENTER]', {
      fontFamily: 'monospace',
      fontSize: '7.5px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    btnLabel.setInteractive({ useHandCursor: true });

    const btnContainer = this.add.container(btnX, btnY, [btnBg, btnLabel]);
    btnContainer.setSize(btnW, btnH);
    btnContainer.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    const setHover = (hover: boolean) => {
      btnBg.fillColor = hover ? 0x1e293b : 0x0f172a;
      btnBg.setStrokeStyle(1.5, hover ? 0xfacc15 : 0x38bdf8);
      btnLabel.setColor(hover ? '#facc15' : '#38bdf8');
    };

    btnContainer.on('pointerover', () => setHover(true));
    btnContainer.on('pointerout', () => setHover(false));
    btnBg.on('pointerover', () => setHover(true));
    btnBg.on('pointerout', () => setHover(false));
    btnLabel.on('pointerover', () => setHover(true));
    btnLabel.on('pointerout', () => setHover(false));

    let triggered = false;
    const handleReturn = () => {
      if (triggered) return;
      triggered = true;
      this.cleanupSpectatorMode();
      onReturnToLobby();
    };

    btnContainer.on('pointerdown', handleReturn);
    btnBg.on('pointerdown', handleReturn);
    btnLabel.on('pointerdown', handleReturn);

    // Atalhos de teclado para retorno imediato (ENTER ou ESPAÇO)
    if (this.input.keyboard) {
      this.spectatorKeyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.spectatorKeySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.spectatorKeyEnter.once('down', handleReturn);
      this.spectatorKeySpace.once('down', handleReturn);
    }

    this.spectatorContainer.add(btnContainer);
  }

  public cleanupSpectatorMode() {
    if (this.spectatorKeyEnter) {
      this.spectatorKeyEnter.removeAllListeners();
      this.spectatorKeyEnter = undefined;
    }
    if (this.spectatorKeySpace) {
      this.spectatorKeySpace.removeAllListeners();
      this.spectatorKeySpace = undefined;
    }
    if (this.spectatorContainer) {
      this.spectatorContainer.destroy();
      this.spectatorContainer = undefined;
    }
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
