import * as Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { RemotePlayer } from '../entities/player/RemotePlayer';
import { CombatSystem } from '../systems/CombatSystem';
import { CONSTANTS } from '../core/Constants';
import { EventBus } from '../core/EventBus';
import { CoinDrop } from '../entities/items/CoinDrop';
import { Enemy } from '../entities/enemies/Enemy';
import { RelicChest } from '../entities/items/RelicChest';
import { NetworkManager } from '../network/NetworkManager';
import { PlayerNetworkState, PlayerNetworkAction } from '../network/NetworkTypes';
import { WaveManager } from '../dungeon/WaveManager';

export class DungeonScene extends Phaser.Scene {
  private player!: Player;
  private combatSystem!: CombatSystem;

  private enemyGroup!: Phaser.GameObjects.Group;
  private dropGroup!: Phaser.GameObjects.Group;
  private projectileGroup!: Phaser.GameObjects.Group;
  private arrowGroup!: Phaser.GameObjects.Group;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private chests: RelicChest[] = [];

  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private enemyMap: Map<string, Enemy> = new Map();
  private waveManager!: WaveManager;
  private networkSyncTimer: number = 0;
  private isSpectating: boolean = false;

  constructor() {
    super({ key: 'DungeonScene' });
  }

  public create() {
    const mapW = CONSTANTS.MAP_WIDTH;
    const mapH = CONSTANTS.MAP_HEIGHT;
    this.isSpectating = false;

    // 1. Configurar Limites do Mundo e Câmera
    this.physics.world.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setBackgroundColor('#090a0f');

    // 2. Imagem de Fundo do Mapa (1140x977)
    const mapBg = this.add.image(mapW / 2, mapH / 2, 'mapa_dungeon');
    mapBg.setDepth(CONSTANTS.DEPTH.BACKGROUND);

    // 3. Grupos de Física
    this.enemyGroup = this.add.group({ runChildUpdate: true });
    this.dropGroup = this.add.group({ runChildUpdate: true });
    this.projectileGroup = this.add.group({ runChildUpdate: true });
    this.arrowGroup = this.add.group({ runChildUpdate: true });
    this.wallGroup = this.physics.add.staticGroup();

    // Paredes invisíveis nos limites do mapa
    this.createWorldBoundaries(mapW, mapH);

    // 4. Spawn do Protagonista Roberto no centro do nexo verde
    const startX = 570;
    const startY = 488;
    this.player = new Player(this, startX, startY);
    this.player.setName('player');

    // Câmera segue Roberto suavemente
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // 5. Espalhar Moedas Iniciais de Exploração pelo Mapa
    this.spawnExplorationCoins();

    // 6. Baús de Tesouro em Pontos Estratégicos
    const chest1 = new RelicChest(this, 120, 830);
    const chest2 = new RelicChest(this, 980, 200);
    this.chests.push(chest1, chest2);

    // 7. Configurar Sistema de Combate e Colisões
    this.combatSystem = new CombatSystem(this);
    this.combatSystem.setupCollisions(
      this.player,
      this.enemyGroup,
      this.wallGroup,
      this.projectileGroup,
      this.arrowGroup,
      this.dropGroup
    );

    // 8. Inicializar Gerenciador de Ondas (Waves) e Inimigos
    this.waveManager = new WaveManager(
      this,
      this.enemyGroup,
      this.dropGroup,
      this.projectileGroup,
      this.enemyMap
    );
    this.waveManager.start();

    // 9. Multiplayer P2P: Configurar jogadores remotos e sincronização
    this.remotePlayers.clear();
    this.setupNetworkMultiplayer();

    // 10. Ouvinte de Morte do Roberto com Suporte Cooperativo (Espectador)
    EventBus.once(CONSTANTS.EVENTS.PLAYER_DIED, () => {
      this.handlePlayerDeathCoop();
    });

    // 11. Ouvinte de Morte de Inimigos para Notificar o WaveManager
    EventBus.on(CONSTANTS.EVENTS.ENEMY_DIED, (deadEnemy: Enemy) => {
      this.waveManager.onEnemyKilled(deadEnemy);
    });
  }

  private handlePlayerDeathCoop() {
    if (NetworkManager.isConnected() && this.remotePlayers.size > 0) {
      const aliveAlly = Array.from(this.remotePlayers.values()).find(r => r.active);
      if (aliveAlly) {
        this.isSpectating = true;
        this.cameras.main.startFollow(aliveAlly, true, 0.1, 0.1);

        const banner = this.add.text(
          CONSTANTS.GAME_WIDTH / 2,
          36,
          'VOCÊ CAIU! OBSERVANDO SEU ALIADO...',
          {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#f43f5e',
            stroke: '#000000',
            strokeThickness: 2
          }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(CONSTANTS.DEPTH.UI + 10);

        this.tweens.add({
          targets: banner,
          alpha: 0.4,
          duration: 600,
          yoyo: true,
          repeat: -1
        });
        return;
      }
    }

    this.time.delayedCall(1200, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { victory: false });
    });
  }

  private setupNetworkMultiplayer() {
    NetworkManager.connectedPeers.forEach(peerId => {
      this.createRemotePlayer(peerId);
    });

    NetworkManager.onPeerJoin((peerId: string) => {
      this.createRemotePlayer(peerId);
    });

    NetworkManager.onPeerLeave((peerId: string) => {
      const remote = this.remotePlayers.get(peerId);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(peerId);
      }
      if (this.isSpectating && this.player.health.isDead()) {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', { victory: false });
      }
    });

    NetworkManager.onState((state: PlayerNetworkState, peerId: string) => {
      let remote = this.remotePlayers.get(peerId);
      if (!remote) {
        remote = this.createRemotePlayer(peerId);
      }
      remote.applyNetworkState(state);
    });

    NetworkManager.onAction((action: PlayerNetworkAction, peerId: string) => {
      const remote = this.remotePlayers.get(peerId);

      if (action.type === 'shoot_arrow' && remote) {
        remote.remoteShootArrow(this.arrowGroup, action.payload.targetX, action.payload.targetY);
      } else if (action.type === 'melee_attack' && remote) {
        remote.remoteMeleeAttack(this.enemyGroup);
      } else if (action.type === 'enemy_hit') {
        const { enemyId, damage, sourceX, sourceY } = action.payload;
        const enemy = this.enemyMap.get(enemyId);
        if (enemy && enemy.active && enemy.health && !enemy.health.isDead()) {
          enemy.health.takeDamage(damage);
          if (enemy.movement) {
            enemy.movement.applyKnockback(sourceX, sourceY, 130, 120);
          }
        }
      } else if (action.type === 'dungeon_victory') {
        this.time.delayedCall(1200, () => {
          this.scene.stop('UIScene');
          this.scene.start('GameOverScene', { victory: true });
        });
      } else if (action.type === 'scene_sync' && action.payload?.wave) {
        if (!NetworkManager.isHost && this.waveManager.currentWave !== action.payload.wave) {
          this.waveManager.currentWave = action.payload.wave - 1;
          this.waveManager.nextWave();
        }
      }
    });
  }

  private createRemotePlayer(peerId: string): RemotePlayer {
    if (this.remotePlayers.has(peerId)) {
      return this.remotePlayers.get(peerId)!;
    }
    const remote = new RemotePlayer(this, this.player.x + 25, this.player.y, peerId);
    this.remotePlayers.set(peerId, remote);
    return remote;
  }

  private createWorldBoundaries(w: number, h: number) {
    const thickness = 20;
    const createWall = (x: number, y: number, width: number, height: number) => {
      const zone = this.add.zone(x, y, width, height);
      this.physics.add.existing(zone, true);
      this.wallGroup.add(zone);
    };

    createWall(w / 2, thickness / 2, w, thickness);
    createWall(w / 2, h - thickness / 2, w, thickness);
    createWall(thickness / 2, h / 2, thickness, h);
    createWall(w - thickness / 2, h / 2, thickness, h);
  }

  private spawnExplorationCoins() {
    // Apenas 2 moedas secretas em cantos distantes da masmorra
    const coinPositions = [
      { x: 140, y: 140 },
      { x: 1000, y: 840 }
    ];

    coinPositions.forEach(pos => {
      const coin = new CoinDrop(this, pos.x, pos.y, 1);
      this.dropGroup.add(coin);
    });
  }

  public override update(time: number, delta: number) {
    // 1. Se o jogador ainda estiver vivo, atualiza ações e movimentação
    if (!this.player.health.isDead()) {
      this.player.update(time, delta);
      this.player.handleActions(this.enemyGroup, this.arrowGroup);
    }

    // 2. Sincronização de Rede P2P (25Hz)
    this.networkSyncTimer += delta;
    if (this.networkSyncTimer >= 40) {
      this.networkSyncTimer = 0;
      if (NetworkManager.isConnected()) {
        NetworkManager.sendState(this.player.getNetworkState());
      }
    }

    // 3. Atualizar Aliados Remotos
    this.remotePlayers.forEach(remote => {
      if (remote.active) {
        remote.update(time, delta);
      }
    });

    // 4. Atualizar Comportamento dos Inimigos (Perseguição ao Jogador Mais Próximo)
    const enemies = this.enemyGroup.getChildren() as Enemy[];
    enemies.forEach(enemy => {
      if (enemy.active) {
        let closestTarget: Phaser.GameObjects.Sprite | null = !this.player.health.isDead() ? this.player : null;
        let minDist = closestTarget ? Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) : 999999;

        this.remotePlayers.forEach(remote => {
          if (remote.active) {
            const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, remote.x, remote.y);
            if (d < minDist) {
              minDist = d;
              closestTarget = remote;
            }
          }
        });

        if (closestTarget) {
          enemy.aiBehavior(closestTarget, delta);
        }
      }
    });

    // 5. Atualizar Atração Magnética de Drops (Moedas e Flechas)
    if (!this.player.health.isDead()) {
      const drops = this.dropGroup.getChildren() as any[];
      drops.forEach(drop => {
        if (drop.active && typeof drop.updateMagnet === 'function') {
          drop.updateMagnet(this.player);
        }
      });
    }

    // 6. Interação com Baús
    this.chests.forEach(chest => {
      if (chest.checkPlayerNear(this.player) && this.player.controller.isInteractPressed()) {
        chest.open();
      }
    });
  }
}
