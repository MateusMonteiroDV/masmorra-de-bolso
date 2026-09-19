import * as Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { CombatSystem } from '../systems/CombatSystem';
import { CONSTANTS } from '../core/Constants';
import { EventBus } from '../core/EventBus';
import { CoinDrop } from '../entities/items/CoinDrop';
import { Enemy } from '../entities/enemies/Enemy';
import { SlimeEnemy } from '../entities/enemies/SlimeEnemy';
import { BatEnemy } from '../entities/enemies/BatEnemy';
import { SkeletonMage } from '../entities/enemies/SkeletonMage';
import { KingSlimeBoss } from '../entities/enemies/KingSlimeBoss';
import { RelicChest } from '../entities/items/RelicChest';

export class DungeonScene extends Phaser.Scene {
  private player!: Player;
  private combatSystem!: CombatSystem;

  private enemyGroup!: Phaser.GameObjects.Group;
  private dropGroup!: Phaser.GameObjects.Group;
  private projectileGroup!: Phaser.GameObjects.Group;
  private arrowGroup!: Phaser.GameObjects.Group;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private chests: RelicChest[] = [];

  constructor() {
    super({ key: 'DungeonScene' });
  }

  public create() {
    const mapW = CONSTANTS.MAP_WIDTH;
    const mapH = CONSTANTS.MAP_HEIGHT;

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

    // 5. Espalhar Moedas Exploráveis pelo Mapa
    this.spawnExplorationCoins();

    // 6. Espalhar Monstros Hostis pelos Setores do Mapa
    this.spawnEnemies();

    // 7. Baús de Tesouro em Pontos Especiais
    const chest1 = new RelicChest(this, 120, 830); // Acampamento no canto inferior esquerdo
    const chest2 = new RelicChest(this, 980, 200); // Quadrante superior direito
    this.chests.push(chest1, chest2);

    // 8. Configurar Sistema de Combate e Colisões
    this.combatSystem = new CombatSystem(this);
    this.combatSystem.setupCollisions(
      this.player,
      this.enemyGroup,
      this.wallGroup,
      this.projectileGroup,
      this.arrowGroup,
      this.dropGroup
    );

    // 9. Ouvinte de Morte do Roberto
    EventBus.once(CONSTANTS.EVENTS.PLAYER_DIED, () => {
      this.time.delayedCall(1200, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', { victory: false });
      });
    });
  }

  private createWorldBoundaries(w: number, h: number) {
    const thickness = 20;
    // Topo, Baixo, Esquerda, Direita
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
    // Espalha moedas animadas pelos caminhos e salas do mapa
    const coinPositions = [
      { x: 570, y: 350 },
      { x: 570, y: 220 },
      { x: 570, y: 650 },
      { x: 570, y: 780 },
      { x: 380, y: 488 },
      { x: 220, y: 488 },
      { x: 750, y: 488 },
      { x: 920, y: 488 },
      { x: 180, y: 200 },
      { x: 280, y: 260 },
      { x: 160, y: 800 },
      { x: 320, y: 880 },
      { x: 800, y: 750 },
      { x: 900, y: 850 },
      { x: 820, y: 260 },
      { x: 950, y: 320 }
    ];

    coinPositions.forEach(pos => {
      const coin = new CoinDrop(this, pos.x, pos.y, 1);
      this.dropGroup.add(coin);
    });
  }

  private spawnEnemies() {
    // 1. Slimes (Mais fracos, 4 HP - morrem com 2 flechas)
    const slimePositions = [
      { x: 570, y: 300 },
      { x: 420, y: 488 },
      { x: 720, y: 488 },
      { x: 570, y: 700 },
      { x: 240, y: 280 },
      { x: 850, y: 320 },
      { x: 340, y: 820 }
    ];
    slimePositions.forEach(pos => {
      const slime = new SlimeEnemy(this, pos.x, pos.y, this.dropGroup);
      this.enemyGroup.add(slime);
    });

    // 2. Morcegos (inativos por enquanto conforme solicitado)
    /*
    const batPositions = [
      { x: 300, y: 380 },
      { x: 820, y: 600 },
      { x: 200, y: 650 }
    ];
    batPositions.forEach(pos => {
      const bat = new BatEnemy(this, pos.x, pos.y, this.dropGroup);
      this.enemyGroup.add(bat);
    });
    */

    // 3. Magos Conjuradores
    const magePositions = [
      { x: 780, y: 220 },
      { x: 880, y: 720 }
    ];
    magePositions.forEach(pos => {
      const mage = new SkeletonMage(this, pos.x, pos.y, this.dropGroup, this.projectileGroup);
      this.enemyGroup.add(mage);
    });

    // 4. Chefe na área de ruínas no canto inferior direito
    const boss = new KingSlimeBoss(this, 880, 820, this.dropGroup, this.enemyGroup);
    this.enemyGroup.add(boss);
  }

  public override update(time: number, delta: number) {
    if (this.player.health.isDead()) return;

    // 1. Atualizar Jogador e Ações (Espada e Flechas)
    this.player.update(time, delta);
    this.player.handleActions(this.enemyGroup, this.arrowGroup);

    // 2. Atualizar Comportamento dos Inimigos (Perseguição ao Roberto)
    const enemies = this.enemyGroup.getChildren() as Enemy[];
    enemies.forEach(enemy => {
      if (enemy.active) {
        enemy.aiBehavior(this.player, delta);
      }
    });

    // 3. Atualizar Atração Magnética de Moedas
    const coins = this.dropGroup.getChildren() as CoinDrop[];
    coins.forEach(coin => {
      if (coin.active) {
        coin.updateMagnet(this.player);
      }
    });

    // 4. Interação com Baús
    this.chests.forEach(chest => {
      if (chest.checkPlayerNear(this.player) && this.player.controller.isInteractPressed()) {
        chest.open();
      }
    });
  }
}
