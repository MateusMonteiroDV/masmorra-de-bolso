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
import { isTouchDevice } from '../ui/TouchControls';
import { ArenaLayout, MAIN_ARENA, BOSS_ARENA, buildWallRects } from '../dungeon/ArenaLayouts';
import { CapetaoBoss } from '../entities/enemies/CapetaoBoss';
import { KleberHostage } from '../entities/npcs/KleberHostage';
import { SlimeEnemy } from '../entities/enemies/SlimeEnemy';
import { BatEnemy } from '../entities/enemies/BatEnemy';
import { SkeletonMage } from '../entities/enemies/SkeletonMage';
import { CapetaoMinionSpawn, getCapetaoHordeInterval, planCapetaoHorde } from '../dungeon/CapetaoMinions';

const BOSS_NETWORK_ID = 'boss_capetao';
const BOSS_PORTAL_COUNTDOWN_SECONDS = 10;
const BOSS_MISSION_TEXT = 'Salve o Kleber do Capetão! Ele está amarrado!';
const BOSS_MISSION_DONE_TEXT = 'O Kleber foi desamarrado!';

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
  private revivePrompt?: Phaser.GameObjects.Text;

  // Arenas (Sala Principal -> Sala do Capetão)
  private currentArena: ArenaLayout = MAIN_ARENA;
  private mapBackground?: Phaser.GameObjects.Image;
  private bossPortalGraphics?: Phaser.GameObjects.Graphics;
  private bossPortalText?: Phaser.GameObjects.Text;
  private bossPortalTimer?: Phaser.Time.TimerEvent;
  private bossPortalSecondsLeft: number = 0;
  private isBossPortalOpen: boolean = false;
  private isEnteringBossArena: boolean = false;
  private isInBossArena: boolean = false;
  private isVictoryScheduled: boolean = false;

  // Refém amarrado no topo da Sala do Capetão
  private kleber?: KleberHostage;

  // Lacaios que surgem em hordas enquanto o Capetão estiver vivo
  private capetaoMinionTimer: number = 0;
  private capetaoHordeNumber: number = 0;
  private isCapetaoSummoning: boolean = false;

  private static readonly REVIVE_RANGE = 58;

  constructor() {
    super({ key: 'DungeonScene' });
  }

  public create() {
    this.isSpectating = false;
    this.isTransitioningToGameOver = false;
    this.isBossPortalOpen = false;
    this.isEnteringBossArena = false;
    this.isInBossArena = false;
    this.isVictoryScheduled = false;
    this.isCapetaoSummoning = false;
    this.capetaoHordeNumber = 0;
    this.kleber = undefined;
    this.bossPortalGraphics = undefined;
    this.bossPortalText = undefined;
    this.bossPortalTimer = undefined;
    // Objetos da execução anterior da cena já foram destruídos no shutdown
    this.aimGuideGraphics = undefined;
    this.mapBackground = undefined;
    this.chests = [];
    if (this.gameOverTimer) {
      this.gameOverTimer.destroy();
      this.gameOverTimer = undefined;
    }

    this.cameras.main.setBackgroundColor('#090a0f');
    this.cameras.main.setZoom(1); // Zoom 1:1 nativo; a nitidez vem da escala inteira do canvas

    // 1. Grupos de Física
    this.enemyGroup = this.add.group({ runChildUpdate: true });
    this.dropGroup = this.add.group({ runChildUpdate: true });
    this.projectileGroup = this.add.group({ runChildUpdate: true });
    this.arrowGroup = this.add.group({ runChildUpdate: true });
    this.wallGroup = this.physics.add.staticGroup();

    // 2. Sala Principal: mapa, limites e paredes geradas a partir do piso caminhável
    this.loadArena(MAIN_ARENA);

    // 3. Spawn do Protagonista Roberto no centro da sala
    this.player = new Player(this, MAIN_ARENA.playerSpawn.x, MAIN_ARENA.playerSpawn.y);
    this.player.setName('player');

    // Câmera segue Roberto suavemente
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // 4. Moedas de exploração e Baús de Tesouro em pontos estratégicos
    this.spawnExplorationCoins();
    MAIN_ARENA.chestPositions.forEach(position => this.addChest(position.x, position.y));

    // 5. Configurar Sistema de Combate e Colisões
    this.combatSystem = new CombatSystem(this);
    this.combatSystem.setupCollisions(
      this.player,
      this.enemyGroup,
      this.wallGroup,
      this.projectileGroup,
      this.arrowGroup,
      this.dropGroup
    );

    // 6. Inicializar Gerenciador de Ondas (Waves) e Inimigos
    this.waveManager = new WaveManager(
      this,
      this.enemyGroup,
      this.dropGroup,
      this.projectileGroup,
      this.enemyMap
    );
    this.waveManager.start();

    // 7. Multiplayer P2P: Configurar jogadores remotos e sincronização
    this.remotePlayers.clear();
    this.setupNetworkMultiplayer();

    if (NetworkManager.isHost && NetworkManager.isConnected()) {
      NetworkManager.sendAction({
        type: 'scene_sync',
        payload: { scene: 'DungeonScene' }
      });
    }

    // 8. Ouvinte de Morte do Roberto com Suporte Cooperativo (Espectador)
    EventBus.on(CONSTANTS.EVENTS.PLAYER_DIED, () => {
      this.handlePlayerDeathCoop();
    });

    // 9. Ouvinte de Morte de Inimigos (ondas e chefe final)
    EventBus.on(CONSTANTS.EVENTS.ENEMY_DIED, (deadEnemy: Enemy) => {
      if (deadEnemy instanceof CapetaoBoss) {
        this.handleCapetaoDefeated();
        return;
      }
      if (deadEnemy.getData('isCapetaoMinion')) {
        this.enemyMap.delete(deadEnemy.getData('networkId'));
        return;
      }
      this.waveManager.onEnemyKilled(deadEnemy);
    });

    // 10. Baús pedidos por inimigos (ex.: Rei Slime) são registrados para poderem ser abertos
    EventBus.on(CONSTANTS.EVENTS.CHEST_SPAWN_REQUESTED, (position: { x: number; y: number }) => {
      this.addChest(position.x, position.y);
    });

    // 11. Recompensa por onda concluída: cura parcial do herói
    EventBus.on(CONSTANTS.EVENTS.WAVE_CLEAR_REWARD, (reward: { bonusGold: number }) => {
      this.player.healBy(CONSTANTS.PLAYER.WAVE_CLEAR_HEAL);
      this.showFloatingText(this.player.x, this.player.y - 46, `+${reward.bonusGold} G BÔNUS DE ONDA`, '#fbbf24');
    });

    // 12. Fim das 8 ondas: abre o portal para a Sala do Capetão
    EventBus.on(CONSTANTS.EVENTS.WAVES_CLEARED, () => {
      this.openBossPortal();
    });
  }

  /** Troca o mapa, os limites do mundo/câmera e as paredes físicas para a arena indicada */
  private loadArena(arena: ArenaLayout) {
    this.currentArena = arena;

    this.mapBackground?.destroy();
    this.mapBackground = this.add.image(0, 0, arena.textureKey).setOrigin(0, 0);
    this.mapBackground.setDepth(CONSTANTS.DEPTH.BACKGROUND);

    this.physics.world.setBounds(0, 0, arena.width, arena.height);
    this.cameras.main.setBounds(0, 0, arena.width, arena.height);

    this.wallGroup.clear(true, true);
    const wallRects = [...buildWallRects(arena.floorPolygon, arena.width, arena.height), ...arena.obstacles];
    wallRects.forEach(rect => {
      const zone = this.add.zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
      this.physics.add.existing(zone, true);
      this.wallGroup.add(zone);
    });
  }

  private addChest(x: number, y: number) {
    const chest = new RelicChest(this, x, y);
    this.chests.push(chest);
    return chest;
  }

  private showFloatingText(x: number, y: number, message: string, color: string) {
    const label = this.add.text(x, y, message, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI + 10);
    this.tweens.add({
      targets: label,
      y: y - 16,
      alpha: 0,
      delay: 500,
      duration: 900,
      onComplete: () => label.destroy()
    });
  }

  // ===================== Portal e Sala do Capetão =====================

  private openBossPortal() {
    const portal = MAIN_ARENA.bossPortal;
    if (this.isBossPortalOpen || this.isInBossArena || !portal) return;
    this.isBossPortalOpen = true;
    this.bossPortalSecondsLeft = BOSS_PORTAL_COUNTDOWN_SECONDS;

    // Portal flamejante na porta norte da sala
    this.bossPortalGraphics = this.add.graphics().setDepth(CONSTANTS.DEPTH.DOORS);
    this.bossPortalGraphics.fillStyle(0xdc2626, 0.35);
    this.bossPortalGraphics.fillEllipse(portal.x, portal.y - 18, portal.radius * 2, portal.radius * 1.6);
    this.bossPortalGraphics.lineStyle(2, 0xf97316, 0.95);
    this.bossPortalGraphics.strokeEllipse(portal.x, portal.y - 18, portal.radius * 2, portal.radius * 1.6);
    this.tweens.add({ targets: this.bossPortalGraphics, alpha: 0.45, duration: 450, yoyo: true, repeat: -1 });

    this.bossPortalText = this.add.text(this.scale.width / 2, 92, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#f97316',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(CONSTANTS.DEPTH.UI + 20);
    this.updateBossPortalText();

    this.bossPortalTimer = this.time.addEvent({
      delay: 1000,
      repeat: BOSS_PORTAL_COUNTDOWN_SECONDS - 1,
      callback: () => {
        this.bossPortalSecondsLeft--;
        this.updateBossPortalText();
        if (this.bossPortalSecondsLeft <= 0) {
          this.enterBossArena(true);
        }
      }
    });
  }

  private updateBossPortalText() {
    this.bossPortalText?.setText(
      `🔥 ENTRE NO PORTAL AO NORTE OU SEJA PUXADO EM ${this.bossPortalSecondsLeft}s 🔥`
    );
  }

  /** Teleporta o grupo para a Sala do Capetão. `broadcast` avisa os aliados para irem juntos. */
  private enterBossArena(broadcast: boolean) {
    if (this.isEnteringBossArena || this.isInBossArena || this.isTransitioningToGameOver) return;
    this.isEnteringBossArena = true;
    this.waveManager.allWavesCleared = true;

    if (broadcast && NetworkManager.isConnected()) {
      NetworkManager.sendAction({ type: 'boss_phase' });
    }

    this.bossPortalTimer?.destroy();
    this.bossPortalTimer = undefined;
    this.bossPortalText?.destroy();
    this.bossPortalText = undefined;

    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (!this.sys.isActive() && !this.sys.isPaused()) return;
      this.setupBossArena();
      this.cameras.main.fadeIn(500, 0, 0, 0);
    });
  }

  private setupBossArena() {
    // Ouro ainda no chão é coletado automaticamente para ninguém perder recompensa no teleporte
    (this.dropGroup.getChildren() as any[]).forEach(drop => {
      if (drop instanceof CoinDrop && drop.active) {
        GameState.addRunGold(drop.value);
      }
    });
    this.dropGroup.clear(true, true);
    this.enemyGroup.clear(true, true);
    this.projectileGroup.clear(true, true);
    this.arrowGroup.clear(true, true);
    this.enemyMap.clear();
    this.chests.forEach(chest => chest.active && chest.destroy());
    this.chests = [];
    this.bossPortalGraphics?.destroy();
    this.bossPortalGraphics = undefined;

    this.loadArena(BOSS_ARENA);
    this.isInBossArena = true;
    this.isEnteringBossArena = false;

    // Heróis caídos voltam à luta na sala do chefe
    if (this.player.health.isDead()) {
      this.reviveLocalPlayer();
    }
    this.player.teleportTo(BOSS_ARENA.playerSpawn.x, BOSS_ARENA.playerSpawn.y);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.remotePlayers.forEach(remote => remote.snapTo(BOSS_ARENA.playerSpawn.x + 30, BOSS_ARENA.playerSpawn.y));

    const hostageSpawn = BOSS_ARENA.hostageSpawn!;
    this.kleber = new KleberHostage(this, hostageSpawn.x, hostageSpawn.y);

    EventBus.emit(CONSTANTS.EVENTS.WAVE_CHANGED, { wave: 0, total: 0, remaining: 1, bossName: 'CAPETÃO', mission: BOSS_MISSION_TEXT });
    this.showBossBanner(BOSS_MISSION_TEXT.toUpperCase());

    const bossSpawn = BOSS_ARENA.bossSpawn!;
    this.spawnSummonCloud(bossSpawn.x, bossSpawn.y, 2.5);

    this.time.delayedCall(900, () => {
      if (!this.isInBossArena || this.isTransitioningToGameOver) return;
      const alliesInDungeon = Array.from(this.remotePlayers.values()).filter(remote => remote.active && remote.isAliveInDungeon()).length;
      const boss = new CapetaoBoss(this, bossSpawn.x, bossSpawn.y, this.dropGroup, this.projectileGroup, alliesInDungeon);
      boss.setData('networkId', BOSS_NETWORK_ID);
      this.enemyGroup.add(boss);
      this.enemyMap.set(BOSS_NETWORK_ID, boss);

      this.capetaoHordeNumber = 0;
      this.capetaoMinionTimer = CONSTANTS.ENEMIES.CAPETAO.MINION_FIRST_DELAY;
      this.isCapetaoSummoning = true;
    });
  }

  // ===================== Lacaios do Capetão =====================

  private getCapetaoMinions(): Enemy[] {
    return (this.enemyGroup.getChildren() as Enemy[]).filter(
      enemy => enemy.active && enemy.getData('isCapetaoMinion') && !enemy.health.isDead()
    );
  }

  /** Enquanto o Capetão vive, uma nova horda de lacaios surge a cada intervalo */
  private updateCapetaoMinions(delta: number) {
    if (!this.isCapetaoSummoning || this.isTransitioningToGameOver) return;

    const boss = this.enemyMap.get(BOSS_NETWORK_ID);
    if (!boss || !boss.active || boss.health.isDead()) {
      this.stopCapetaoMinions();
      return;
    }

    this.capetaoMinionTimer -= delta;
    if (this.capetaoMinionTimer > 0) return;

    const isEnraged = boss.health.currentHp <= boss.health.maxHp / 2;
    this.capetaoMinionTimer = getCapetaoHordeInterval(isEnraged);
    this.capetaoHordeNumber++;

    const heroPositions: { x: number; y: number }[] = [];
    if (!this.player.health.isDead()) heroPositions.push({ x: this.player.x, y: this.player.y });
    this.remotePlayers.forEach(remote => {
      if (remote.active && !remote.isDead()) heroPositions.push({ x: remote.x, y: remote.y });
    });

    planCapetaoHorde(this.capetaoHordeNumber, this.getCapetaoMinions().length, heroPositions)
      .forEach((spawn, index) => this.spawnCapetaoMinion(spawn, index));
  }

  private spawnCapetaoMinion(spawn: CapetaoMinionSpawn, index: number) {
    const stats = CONSTANTS.ENEMIES.CAPETAO;
    this.spawnSummonCloud(spawn.x, spawn.y);

    let minion: Enemy;
    let hpMult: number = stats.MINION_HP_MULT;
    if (spawn.kind === 'bat') {
      minion = new BatEnemy(this, spawn.x, spawn.y, this.dropGroup);
      hpMult = 1; // Morcegos continuam morrendo com um golpe, como nas ondas
    } else if (spawn.kind === 'mage') {
      minion = new SkeletonMage(this, spawn.x, spawn.y, this.dropGroup, this.projectileGroup);
    } else {
      minion = new SlimeEnemy(this, spawn.x, spawn.y, this.dropGroup);
    }

    const id = `capetao_minion_${this.capetaoHordeNumber}_${index}`;
    minion.applyDifficultyScale(hpMult, stats.MINION_SPEED_MULT, 1);
    minion.goldReward = stats.MINION_GOLD;
    minion.setData('networkId', id);
    minion.setData('isMinion', true);
    minion.setData('isCapetaoMinion', true);
    this.enemyGroup.add(minion);
    this.enemyMap.set(id, minion);
  }

  /** O Capetão caiu: as hordas param e os lacaios restantes se desfazem em fumaça */
  private stopCapetaoMinions() {
    if (!this.isCapetaoSummoning) return;
    this.isCapetaoSummoning = false;

    this.getCapetaoMinions().forEach(minion => {
      this.spawnSummonCloud(minion.x, minion.y);
      this.enemyMap.delete(minion.getData('networkId'));
      minion.destroy();
    });
  }

  private spawnSummonCloud(x: number, y: number, scale: number = 1) {
    const cloud = this.add.sprite(x, y, 'nuvem_0').setScale(scale).setDepth(CONSTANTS.DEPTH.EFFECTS);
    cloud.play('anim_nuvem');
    cloud.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => cloud.destroy());
  }

  private showBossBanner(text: string) {
    const banner = this.add.text(this.scale.width / 2, 64, text, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ef4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(CONSTANTS.DEPTH.UI + 20);

    this.tweens.add({
      targets: banner,
      y: banner.y - 12,
      alpha: 0,
      delay: 2400,
      duration: 600,
      onComplete: () => banner.destroy()
    });
  }

  /** Capetão derrotado: o Kleber é desamarrado e o herói recebe a recompensa do resgate */
  private rescueKleber() {
    if (!this.kleber?.free()) return;

    const goldBefore = GameState.runGold;
    GameState.addRunGold(CONSTANTS.ENEMIES.CAPETAO.RESCUE_GOLD);
    const rescueGold = GameState.runGold - goldBefore;

    this.spawnSummonCloud(this.kleber.x, this.kleber.y - 20);
    this.showFloatingText(this.kleber.x, this.kleber.y - 54, 'OBRIGADO, HERÓI!', '#4ade80');
    this.showFloatingText(this.player.x, this.player.y - 46, `+${rescueGold} G POR SALVAR O KLEBER`, '#fbbf24');
    EventBus.emit(CONSTANTS.EVENTS.WAVE_CHANGED, { wave: 0, total: 0, remaining: 0, bossName: 'CAPETÃO', mission: BOSS_MISSION_DONE_TEXT });
  }

  private handleCapetaoDefeated() {
    this.showBossBanner(`👑 ${BOSS_MISSION_DONE_TEXT.toUpperCase()} +${CONSTANTS.ENEMIES.CAPETAO.RESCUE_GOLD} G`);
    if (NetworkManager.isConnected()) {
      NetworkManager.sendAction({ type: 'dungeon_victory' });
    }
    this.scheduleVictory(4000);
  }

  private scheduleVictory(delayMs: number) {
    if (this.isVictoryScheduled || this.isTransitioningToGameOver) return;
    this.isVictoryScheduled = true;
    this.stopCapetaoMinions();
    this.rescueKleber();
    this.time.delayedCall(delayMs, () => {
      if (this.isTransitioningToGameOver) return;
      this.isTransitioningToGameOver = true;
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { victory: true });
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
      } else if (action.type === 'player_dash' && remote) {
        remote.remoteDash(action.payload?.dirX ?? 0, action.payload?.dirY ?? 0);
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
        this.scheduleVictory(1200);
      } else if (action.type === 'boss_phase') {
        this.enterBossArena(false);
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
      } else if (action.type === 'player_revive') {
        const targetPeerId = action.payload?.targetPeerId;
        if (targetPeerId === NetworkManager.selfId) {
          this.reviveLocalPlayer();
        } else if (typeof targetPeerId === 'string') {
          this.remotePlayers.get(targetPeerId)?.markRevived();
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
          if (!NetworkManager.isHost && !this.isInBossArena && this.waveManager.currentWave !== action.payload.wave) {
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
      if (this.revivePrompt) {
        this.revivePrompt.destroy();
        this.revivePrompt = undefined;
      }
      this.bossPortalTimer?.destroy();
      this.bossPortalTimer = undefined;
      this.aimGuideGraphics = undefined;
      this.networkUnsubs.forEach(unsub => unsub());
      this.networkUnsubs = [];
      EventBus.removeAllListeners(CONSTANTS.EVENTS.PLAYER_DIED);
      EventBus.removeAllListeners(CONSTANTS.EVENTS.ENEMY_DIED);
      EventBus.removeAllListeners(CONSTANTS.EVENTS.CHEST_SPAWN_REQUESTED);
      EventBus.removeAllListeners(CONSTANTS.EVENTS.WAVE_CLEAR_REWARD);
      EventBus.removeAllListeners(CONSTANTS.EVENTS.WAVES_CLEARED);
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

  private getNearbyFallenAlly(): RemotePlayer | undefined {
    let closest: RemotePlayer | undefined;
    let closestDistance = DungeonScene.REVIVE_RANGE;

    this.remotePlayers.forEach(remote => {
      if (!remote.active || !remote.isDead() || remote.currentScene && remote.currentScene !== 'DungeonScene') return;

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, remote.x, remote.y);
      if (distance <= closestDistance) {
        closest = remote;
        closestDistance = distance;
      }
    });

    return closest;
  }

  private updateRevivePrompt(target?: RemotePlayer) {
    if (!target) {
      this.revivePrompt?.setVisible(false);
      return;
    }

    if (!this.revivePrompt) {
      this.revivePrompt = this.add.text(0, 0, '[E] REVIVER ALIADO', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#4ade80',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI + 10);
    }

    this.revivePrompt.setPosition(target.x, target.y - 47).setVisible(true);
  }

  private reviveRemotePlayer(target: RemotePlayer) {
    if (!target.isDead()) return;

    target.markRevived();
    NetworkManager.sendAction({
      type: 'player_revive',
      payload: { targetPeerId: target.peerId }
    });

    const feedback = this.add.text(target.x, target.y - 25, 'ALIADO REVIVIDO!', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#4ade80',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI + 10);

    this.tweens.add({
      targets: feedback,
      y: feedback.y - 18,
      alpha: 0,
      duration: 900,
      onComplete: () => feedback.destroy()
    });
  }

  private reviveLocalPlayer() {
    if (!this.player.reviveAtHalfHealth()) return;

    this.isSpectating = false;
    this.isTransitioningToGameOver = false;
    this.safeStopFollow();
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    const uiScene = this.scene.get('UIScene') as UIScene;
    if (uiScene && this.scene.isActive('UIScene')) {
      uiScene.cleanupSpectatorMode();
    }

    NetworkManager.sendState(this.player.getNetworkState('DungeonScene'));
  }

  private spawnExplorationCoins() {
    // Apenas 2 moedas secretas em cantos distantes da masmorra
    MAIN_ARENA.coinPositions.forEach(pos => {
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

    // 4b. Hordas de lacaios da Sala do Capetão
    this.updateCapetaoMinions(delta);

    // 5. Atualizar Atração Magnética de Drops (Moedas e Flechas)
    if (!this.player.health.isDead() && !this.isTransitioningToGameOver) {
      const drops = this.dropGroup.getChildren() as any[];
      drops.forEach(drop => {
        if (drop.active && typeof drop.updateMagnet === 'function') {
          drop.updateMagnet(this.player);
        }
      });
    }

    // 6. Interação: reviver aliados tem prioridade sobre abrir baús
    if (!this.player.health.isDead() && !this.isTransitioningToGameOver) {
      const fallenAlly = this.getNearbyFallenAlly();
      this.updateRevivePrompt(fallenAlly);
      const interacted = this.player.controller.isInteractPressed();

      // Todos os baús atualizam o aviso "[E] Abrir" a cada frame (não só ao apertar E)
      const nearbyChests = this.chests.filter(chest => chest && chest.active && chest.checkPlayerNear(this.player));

      if (interacted && fallenAlly) {
        this.reviveRemotePlayer(fallenAlly);
      } else if (interacted) {
        nearbyChests[0]?.open();
      }

      // Entrar no portal aberto leva o grupo imediatamente para a Sala do Capetão
      const portal = MAIN_ARENA.bossPortal;
      if (this.isBossPortalOpen && portal && !this.isEnteringBossArena && !this.isInBossArena) {
        const distanceToPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y);
        if (distanceToPortal <= portal.radius) {
          this.enterBossArena(true);
        }
      }
    } else {
      this.updateRevivePrompt();
    }

    // 7. Trajetória tática de mira da flecha no mobile e retículo tático no mouse
    if (this.player && this.player.active && !this.player.health.isDead()) {
      if (this.player.controller?.isVirtualAiming) {
        this.drawAimGuide(this.player.x, this.player.y, this.player.controller.virtualAimAngleRad);
      } else {
        const pointer = this.input.activePointer;
        const isMouseActive = pointer && (!isTouchDevice(this.game) || !pointer.wasTouch);
        if (isMouseActive && (pointer.x !== 0 || pointer.y !== 0)) {
          const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          this.drawMouseReticle(worldPoint.x, worldPoint.y);
        } else if (this.aimGuideGraphics) {
          this.aimGuideGraphics.clear();
        }
      }
    } else if (this.aimGuideGraphics) {
      this.aimGuideGraphics.clear();
    }
  }

  private aimGuideGraphics?: Phaser.GameObjects.Graphics;

  private drawMouseReticle(targetX: number, targetY: number) {
    if (!this.aimGuideGraphics) {
      this.aimGuideGraphics = this.add.graphics();
      this.aimGuideGraphics.setDepth(CONSTANTS.DEPTH.PROJECTILES + 5);
    }
    this.aimGuideGraphics.clear();

    // Retículo sutil e estilizado de mira no cursor do mouse
    this.aimGuideGraphics.lineStyle(1.5, 0x38bdf8, 0.85);
    this.aimGuideGraphics.strokeCircle(targetX, targetY, 6);
    this.aimGuideGraphics.fillStyle(0x38bdf8, 0.9);
    this.aimGuideGraphics.fillCircle(targetX, targetY, 1.5);

    // Pequenas miras direcionais em cruz
    this.aimGuideGraphics.lineStyle(1, 0x38bdf8, 0.7);
    this.aimGuideGraphics.lineBetween(targetX - 9, targetY, targetX - 4, targetY);
    this.aimGuideGraphics.lineBetween(targetX + 4, targetY, targetX + 9, targetY);
    this.aimGuideGraphics.lineBetween(targetX, targetY - 9, targetX, targetY - 4);
    this.aimGuideGraphics.lineBetween(targetX, targetY + 4, targetX, targetY + 9);
  }

  private drawAimGuide(fromX: number, fromY: number, angleRad: number) {
    if (!this.aimGuideGraphics) {
      this.aimGuideGraphics = this.add.graphics();
      this.aimGuideGraphics.setDepth(CONSTANTS.DEPTH.PROJECTILES + 5);
    }
    this.aimGuideGraphics.clear();

    const maxDist = 140;
    const numDots = 7;

    for (let i = 1; i <= numDots; i++) {
      const step = (maxDist / numDots) * i;
      const dotX = fromX + Math.cos(angleRad) * step;
      const dotY = fromY + Math.sin(angleRad) * step;
      const alpha = 0.3 + (i / numDots) * 0.6;
      const radius = i === numDots ? 3.5 : 2;

      this.aimGuideGraphics.fillStyle(0x38bdf8, alpha);
      this.aimGuideGraphics.fillCircle(dotX, dotY, radius);
    }

    // Retículo luminoso na ponta da mira
    const endX = fromX + Math.cos(angleRad) * maxDist;
    const endY = fromY + Math.sin(angleRad) * maxDist;
    this.aimGuideGraphics.lineStyle(1.5, 0x22c55e, 0.9);
    this.aimGuideGraphics.strokeCircle(endX, endY, 6);
    this.aimGuideGraphics.fillStyle(0x22c55e, 0.4);
    this.aimGuideGraphics.fillCircle(endX, endY, 2.5);
  }
}
