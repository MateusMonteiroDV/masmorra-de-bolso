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
import { GameState } from '../core/GameState';
import { UIScene } from './UIScene';

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
  private isTransitioningToGameOver: boolean = false;
  private gameOverTimer?: Phaser.Time.TimerEvent;
  private networkUnsubs: Array<() => void> = [];

  constructor() {
    super({ key: 'DungeonScene' });
  }

  public create() {
    const mapW = CONSTANTS.MAP_WIDTH;
    const mapH = CONSTANTS.MAP_HEIGHT;
    this.isSpectating = false;
    this.isTransitioningToGameOver = false;
    if (this.gameOverTimer) {
      this.gameOverTimer.destroy();
      this.gameOverTimer = undefined;
    }

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

    if (NetworkManager.isHost && NetworkManager.isConnected()) {
      NetworkManager.sendAction({
        type: 'scene_sync',
        payload: { scene: 'DungeonScene' }
      });
    }

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
    NetworkManager.sendAction({ type: 'player_death' });

    if (NetworkManager.isConnected() && this.remotePlayers.size > 0) {
      const aliveAlly = Array.from(this.remotePlayers.values()).find(
        r => r.active && r.isAliveInDungeon()
      );
      if (aliveAlly) {
        this.isSpectating = true;
        this.cameras.main.startFollow(aliveAlly, true, 0.1, 0.1);

        const uiScene = this.scene.get('UIScene') as UIScene;
        if (uiScene && this.scene.isActive('UIScene')) {
          uiScene.showSpectatorMode(() => {
            this.returnToLobbyFromSpectator();
          });
        } else {
          // Fallback seguro se UIScene não estiver ativa
          this.returnToLobbyFromSpectator();
        }

        return;
      }
    }

    // Se não há nenhum aliado vivo na masmorra, todos os heróis caíram!
    if (NetworkManager.isConnected()) {
      NetworkManager.sendAction({ type: 'all_players_dead' });
    }

    this.triggerGameOverLocally();
  }

  private safeStopFollow(target?: any) {
    try {
      if (this.cameras && this.cameras.main) {
        if (!target || (this.cameras.main as any)._follow === target) {
          this.cameras.main.stopFollow();
        }
      }
    } catch (e) {}
  }

  private returnToLobbyFromSpectator() {
    if (this.gameOverTimer) {
      this.gameOverTimer.destroy();
      this.gameOverTimer = undefined;
    }
    this.safeStopFollow();
    this.isSpectating = false;
    this.isTransitioningToGameOver = true;
    GameState.endRun(false);
    NetworkManager.sendAction({ type: 'lobby_peer_waiting' });
    this.scene.stop('UIScene');
    this.scene.start('LobbyScene');
  }

  private triggerGameOverLocally() {
    if (this.isTransitioningToGameOver) return;
    this.isTransitioningToGameOver = true;
    this.safeStopFollow();

    this.gameOverTimer = this.time.delayedCall(1000, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { victory: false });
    });
  }

  private setupNetworkMultiplayer() {
    NetworkManager.connectedPeers.forEach(peerId => {
      this.createRemotePlayer(peerId);
    });

    const unsubJoin = NetworkManager.onPeerJoin((peerId: string) => {
      this.createRemotePlayer(peerId);
    });
    this.networkUnsubs.push(unsubJoin);

    const unsubLeave = NetworkManager.onPeerLeave((peerId: string) => {
      const remote = this.remotePlayers.get(peerId);
      if (remote) {
        this.safeStopFollow(remote);
        remote.destroy();
        this.remotePlayers.delete(peerId);
      }
      if (this.player.health.isDead() && !this.isTransitioningToGameOver) {
        const anyAllyAlive = Array.from(this.remotePlayers.values()).some(r => r.isAliveInDungeon());
        if (!anyAllyAlive) {
          this.triggerGameOverLocally();
        }
      }
    });
    this.networkUnsubs.push(unsubLeave);

    const unsubState = NetworkManager.onState((state: PlayerNetworkState, peerId: string) => {
      // Se o aliado não estiver na Dungeon (está no Lobby ou Hub), ele saiu da masmorra
      if (state.scene && state.scene !== 'DungeonScene') {
        const remote = this.remotePlayers.get(peerId);
        if (remote) {
          this.safeStopFollow(remote);
          remote.destroy();
          this.remotePlayers.delete(peerId);
        }
        if (this.player.health.isDead() && !this.isTransitioningToGameOver) {
          const anyAllyAlive = Array.from(this.remotePlayers.values()).some(r => r.isAliveInDungeon());
          if (!anyAllyAlive) {
            this.triggerGameOverLocally();
          }
        }
        return;
      }

      let remote = this.remotePlayers.get(peerId);
      if (!remote) {
        remote = this.createRemotePlayer(peerId);
      }
      remote.applyNetworkState(state);

      if (this.isSpectating && this.player.health.isDead() && !this.isTransitioningToGameOver) {
        const anyAllyAlive = Array.from(this.remotePlayers.values()).some(r => r.isAliveInDungeon());
        if (!anyAllyAlive) {
          this.triggerGameOverLocally();
        }
      }
    });
    this.networkUnsubs.push(unsubState);

    const unsubAction = NetworkManager.onAction((action: PlayerNetworkAction, peerId: string) => {
      const remote = this.remotePlayers.get(peerId);

      if (action.type === 'lobby_presence' || action.type === 'lobby_peer_waiting') {
        // Aliado já foi para o Lobby! Não está mais na masmorra
        if (remote) {
          this.safeStopFollow(remote);
          remote.destroy();
          this.remotePlayers.delete(peerId);
        }
        if (this.player.health.isDead() && !this.isTransitioningToGameOver) {
          this.triggerGameOverLocally();
        }
      } else if (action.type === 'shoot_arrow' && remote) {
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
      } else if (action.type === 'all_players_dead') {
        this.remotePlayers.forEach(r => r.markDead());
        this.triggerGameOverLocally();
      } else if (action.type === 'player_death') {
        const deadPeer = this.remotePlayers.get(peerId);
        if (deadPeer) {
          deadPeer.markDead();
        }
        if (this.player.health.isDead() && !this.isTransitioningToGameOver) {
          const anyAllyAlive = Array.from(this.remotePlayers.values()).some(r => r.isAliveInDungeon());
          if (!anyAllyAlive) {
            this.triggerGameOverLocally();
          }
        }
      } else if (action.type === 'scene_sync') {
        if (action.payload?.scene === 'GameOverScene') {
          // Jogador vivo NUNCA é puxado para GameOverScene por terceiros
          if (this.player.health.isDead() && !this.isTransitioningToGameOver) {
            this.triggerGameOverLocally();
          }
        } else if (action.payload?.scene === 'LobbyScene') {
          // Jogador vivo NUNCA é puxado para LobbyScene enquanto estiver em combate
          if (this.player.health.isDead() && !this.isTransitioningToGameOver) {
            this.scene.stop('UIScene');
            this.scene.start('LobbyScene');
          }
        } else if (action.payload?.wave) {
          if (!NetworkManager.isHost && this.waveManager.currentWave !== action.payload.wave) {
            this.waveManager.currentWave = action.payload.wave - 1;
            this.waveManager.nextWave();
          }
        }
      }
    });
    this.networkUnsubs.push(unsubAction);

    this.events.once('shutdown', () => {
      if (this.gameOverTimer) {
        this.gameOverTimer.destroy();
        this.gameOverTimer = undefined;
      }
      this.safeStopFollow();
      this.chests.forEach(chest => {
        if (chest && chest.active) chest.destroy();
      });
      this.chests = [];
      this.networkUnsubs.forEach(unsub => unsub());
      this.networkUnsubs = [];
      EventBus.removeAllListeners(CONSTANTS.EVENTS.PLAYER_DIED);
      EventBus.removeAllListeners(CONSTANTS.EVENTS.ENEMY_DIED);
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

    // Paredes delimitadoras sem sobreposição nos cantos para evitar que corpos fiquem presos
    createWall(w / 2, thickness / 2, w, thickness);
    createWall(w / 2, h - thickness / 2, w, thickness);
    const sideHeight = Math.max(0, h - thickness * 2);
    createWall(thickness / 2, h / 2, thickness, sideHeight);
    createWall(w - thickness / 2, h / 2, thickness, sideHeight);
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
    // 0. Watchdog de Morte Cooperativa: se o jogador local morreu, monitora se todos os aliados na masmorra também morreram
    if (this.player.health.isDead() && !this.isTransitioningToGameOver) {
      if (NetworkManager.isConnected() && this.remotePlayers.size > 0) {
        const anyAllyAlive = Array.from(this.remotePlayers.values()).some(r => r.isAliveInDungeon());
        if (!anyAllyAlive) {
          this.triggerGameOverLocally();
        }
      } else {
        this.triggerGameOverLocally();
      }
    }

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
        NetworkManager.sendState(this.player.getNetworkState('DungeonScene'));
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
          if (remote.active && !remote.isDead()) {
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
    if (!this.player.health.isDead() && !this.isTransitioningToGameOver) {
      const drops = this.dropGroup.getChildren() as any[];
      drops.forEach(drop => {
        if (drop.active && typeof drop.updateMagnet === 'function') {
          drop.updateMagnet(this.player);
        }
      });
    }

    // 6. Interação com Baús
    if (!this.player.health.isDead() && !this.isTransitioningToGameOver) {
      this.chests.forEach(chest => {
        if (chest && chest.active && chest.checkPlayerNear(this.player) && this.player.controller.isInteractPressed()) {
          chest.open();
        }
      });
    }
  }
}
