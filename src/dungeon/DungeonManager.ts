import * as Phaser from 'phaser';
import { DungeonGenerator, DungeonLayout } from './DungeonGenerator';
import { Room } from './Room';
import { Door, DoorDirection } from './Door';
import { CONSTANTS } from '../core/Constants';
import { ASSET_KEYS } from '../assets/AssetManifest';
import { EventBus } from '../core/EventBus';
import { AudioService } from '../systems/AudioService';
import { SlimeEnemy } from '../entities/enemies/SlimeEnemy';
import { BatEnemy } from '../entities/enemies/BatEnemy';
import { SkeletonMage } from '../entities/enemies/SkeletonMage';
import { KingSlimeBoss } from '../entities/enemies/KingSlimeBoss';
import { RelicChest } from '../entities/items/RelicChest';

export class DungeonManager {
  private scene: Phaser.Scene;
  public layout!: DungeonLayout;
  public currentRoom!: Room;
  public wallGroup: Phaser.Physics.Arcade.StaticGroup;
  public doorGroup: Phaser.Physics.Arcade.StaticGroup;
  public enemyGroup: Phaser.GameObjects.Group;
  public dropGroup: Phaser.GameObjects.Group;
  public projectileGroup: Phaser.GameObjects.Group;
  public chests: RelicChest[] = [];

  constructor(
    scene: Phaser.Scene,
    enemyGroup: Phaser.GameObjects.Group,
    dropGroup: Phaser.GameObjects.Group,
    projectileGroup: Phaser.GameObjects.Group
  ) {
    this.scene = scene;
    this.enemyGroup = enemyGroup;
    this.dropGroup = dropGroup;
    this.projectileGroup = projectileGroup;

    this.wallGroup = scene.physics.add.staticGroup();
    this.doorGroup = scene.physics.add.staticGroup();
  }

  public buildDungeon(floorNumber: number = 1): Room {
    this.layout = DungeonGenerator.generate(3, floorNumber);
    this.currentRoom = this.layout.startRoom;

    // 1. Construir piso e paredes para cada sala
    this.layout.rooms.forEach((room) => {
      this.buildRoomGeometry(room);
    });

    // 2. Conectar portas entre salas adjacentes
    this.buildDoors();

    return this.currentRoom;
  }

  private buildRoomGeometry(room: Room) {
    const tileSize = CONSTANTS.TILE_SIZE;
    const tilesX = Math.floor(room.width / tileSize);
    const tilesY = Math.floor(room.height / tileSize);

    for (let tx = 0; tx < tilesX; tx++) {
      for (let ty = 0; ty < tilesY; ty++) {
        const posX = room.worldX + tx * tileSize + tileSize / 2;
        const posY = room.worldY + ty * tileSize + tileSize / 2;

        // Sempre desenha o chão da masmorra
        const floor = this.scene.add.image(posX, posY, ASSET_KEYS.ENVIRONMENT.FLOOR);
        floor.setDepth(CONSTANTS.DEPTH.FLOOR);

        // Parede externa (borda)
        const isBorder = tx === 0 || tx === tilesX - 1 || ty === 0 || ty === tilesY - 1;
        // Abertura central nas paredes para portas
        const isDoorOpeningX = (tx === Math.floor(tilesX / 2)) && (ty === 0 || ty === tilesY - 1);
        const isDoorOpeningY = (ty === Math.floor(tilesY / 2)) && (tx === 0 || tx === tilesX - 1);

        if (isBorder && !isDoorOpeningX && !isDoorOpeningY) {
          const wall = this.wallGroup.create(posX, posY, ASSET_KEYS.ENVIRONMENT.WALL) as Phaser.Physics.Arcade.Image;
          wall.setDepth(CONSTANTS.DEPTH.WALLS);
          wall.refreshBody();
        }
      }
    }

    // Se for sala de tesouro, já cria o baú no centro
    if (room.roomType === 'TREASURE') {
      const center = room.getCenter();
      const chest = new RelicChest(this.scene, center.x, center.y);
      room.chest = chest;
      this.chests.push(chest);
    }
  }

  private buildDoors() {
    const keyOf = (x: number, y: number) => `${x},${y}`;

    this.layout.rooms.forEach((room) => {
      const center = room.getCenter();
      const halfW = room.width / 2;
      const halfH = room.height / 2;

      const neighborNorth = this.layout.rooms.get(keyOf(room.gridX, room.gridY - 1));
      const neighborSouth = this.layout.rooms.get(keyOf(room.gridX, room.gridY + 1));
      const neighborEast = this.layout.rooms.get(keyOf(room.gridX + 1, room.gridY));
      const neighborWest = this.layout.rooms.get(keyOf(room.gridX - 1, room.gridY));

      const addDoor = (x: number, y: number, dir: DoorDirection, targetGX: number, targetGY: number) => {
        const door = new Door(this.scene, x, y, dir, targetGX, targetGY);
        this.doorGroup.add(door);
        room.doors.push(door);
      };

      if (neighborNorth) addDoor(center.x, room.worldY + 8, 'NORTH', neighborNorth.gridX, neighborNorth.gridY);
      if (neighborSouth) addDoor(center.x, room.worldY + room.height - 8, 'SOUTH', neighborSouth.gridX, neighborSouth.gridY);
      if (neighborEast) addDoor(room.worldX + room.width - 8, center.y, 'EAST', neighborEast.gridX, neighborEast.gridY);
      if (neighborWest) addDoor(room.worldX + 8, center.y, 'WEST', neighborWest.gridX, neighborWest.gridY);
    });
  }

  public update(player: Phaser.GameObjects.Sprite) {
    // 1. Detectar em qual sala o jogador está
    this.layout.rooms.forEach((room) => {
      if (room.containsPoint(player.x, player.y)) {
        if (room !== this.currentRoom) {
          this.onEnterRoom(room, player);
        }
      }
    });

    // 2. Verificar se a sala atual em combate foi limpa
    if (this.currentRoom.isLockdownActive) {
      const remainingEnemies = this.currentRoom.enemies.filter(e => e.active && !e.health.isDead());
      if (remainingEnemies.length === 0) {
        this.endRoomLockdown(this.currentRoom);
      }
    }

    // 3. Verificar interação com baús
    this.chests.forEach(chest => {
      chest.checkPlayerNear(player);
    });
  }

  private onEnterRoom(newRoom: Room, player: Phaser.GameObjects.Sprite) {
    this.currentRoom = newRoom;
    newRoom.isDiscovered = true;

    EventBus.emit(CONSTANTS.EVENTS.ROOM_ENTERED, {
      gridX: newRoom.gridX,
      gridY: newRoom.gridY,
      type: newRoom.roomType,
      isCleared: newRoom.isCleared
    });

    // Se for sala de combate ou chefe e ainda não foi limpa: inicia Lockdown
    if (!newRoom.isCleared && (newRoom.roomType === 'COMBAT' || newRoom.roomType === 'BOSS')) {
      this.startRoomLockdown(newRoom);
    }
  }

  private startRoomLockdown(room: Room) {
    room.isLockdownActive = true;

    // Trancar todas as portas da sala
    room.doors.forEach(door => door.setLocked(true));

    AudioService.playPlayerHurt(); // Som de alarme/portas batendo
    EventBus.emit(CONSTANTS.EVENTS.ROOM_LOCKDOWN_START);

    // Gerar inimigos na sala
    const center = room.getCenter();

    if (room.roomType === 'BOSS') {
      const boss = new KingSlimeBoss(this.scene, center.x, center.y, this.dropGroup, this.enemyGroup);
      this.enemyGroup.add(boss);
      room.enemies.push(boss);
    } else {
      // Sala normal: gera Slimes, Morcegos e Magos
      const enemyCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < enemyCount; i++) {
        const rx = room.worldX + 32 + Math.random() * (room.width - 64);
        const ry = room.worldY + 32 + Math.random() * (room.height - 64);

        const rand = Math.random();
        let enemy;
        if (rand < 0.45) {
          enemy = new SlimeEnemy(this.scene, rx, ry, this.dropGroup);
        } else if (rand < 0.8) {
          enemy = new BatEnemy(this.scene, rx, ry, this.dropGroup);
        } else {
          enemy = new SkeletonMage(this.scene, rx, ry, this.dropGroup, this.projectileGroup);
        }

        this.enemyGroup.add(enemy);
        room.enemies.push(enemy);
      }
    }
  }

  private endRoomLockdown(room: Room) {
    room.isLockdownActive = false;
    room.isCleared = true;

    // Destrancar portas
    room.doors.forEach(door => door.setLocked(false));

    AudioService.playRoomCleared();
    EventBus.emit(CONSTANTS.EVENTS.ROOM_LOCKDOWN_END);

    // Se venceu o Chefe, cria um portal para o Hub ou próxima fase
    if (room.roomType === 'BOSS') {
      const center = room.getCenter();
      const portal = this.scene.physics.add.sprite(center.x, center.y + 30, ASSET_KEYS.ENVIRONMENT.PORTAL);
      portal.setDepth(CONSTANTS.DEPTH.DECORATION);
      this.scene.tweens.add({
        targets: portal,
        scale: 1.2,
        rotation: 6.28,
        duration: 2000,
        repeat: -1,
        yoyo: true
      });
      // Colisão para voltar ao Hub com vitória
      this.scene.physics.add.overlap(this.scene.children.getByName('player') as Phaser.GameObjects.Sprite, portal, () => {
        this.scene.scene.start('GameOverScene', { victory: true });
      });
    }
  }
}
