import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { Room } from '../dungeon/Room';

export class Minimap extends Phaser.GameObjects.Container {
  private roomsMap: Map<string, Room> = new Map();
  private graphics: Phaser.GameObjects.Graphics;
  private currentGridX: number = 1;
  private currentGridY: number = 1;
  private boxSize: number = 9;
  private gap: number = 3;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    this.setDepth(CONSTANTS.DEPTH.UI);
    scene.add.existing(this);
  }

  public setRooms(rooms: Map<string, Room>) {
    this.roomsMap = rooms;
    this.draw();
  }

  public setCurrentRoom(gridX: number, gridY: number) {
    this.currentGridX = gridX;
    this.currentGridY = gridY;
    this.draw();
  }

  public draw() {
    this.graphics.clear();

    // Fundo do minimapa
    this.graphics.fillStyle(0x0a0c10, 0.7);
    this.graphics.fillRoundedRect(-4, -4, 48, 48, 4);
    this.graphics.lineStyle(1, 0x334155, 0.8);
    this.graphics.strokeRoundedRect(-4, -4, 48, 48, 4);

    this.roomsMap.forEach((room) => {
      if (!room.isDiscovered) return;

      const px = room.gridX * (this.boxSize + this.gap);
      const py = room.gridY * (this.boxSize + this.gap);

      const isCurrent = room.gridX === this.currentGridX && room.gridY === this.currentGridY;

      // Cor do bloco da sala
      let fillColor = 0x334155;
      if (room.roomType === 'BOSS') fillColor = 0x991b1b;
      else if (room.roomType === 'TREASURE') fillColor = 0xd97706;
      else if (room.isCleared) fillColor = 0x1e293b;

      this.graphics.fillStyle(fillColor, 1);
      this.graphics.fillRect(px, py, this.boxSize, this.boxSize);

      // Borda da sala
      this.graphics.lineStyle(1, isCurrent ? 0x38bdf8 : 0x475569, 1);
      this.graphics.strokeRect(px + 0.5, py + 0.5, this.boxSize - 1, this.boxSize - 1);

      // Marcador do Jogador atual
      if (isCurrent) {
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillCircle(px + this.boxSize / 2, py + this.boxSize / 2, 2);
      }
    });
  }
}
