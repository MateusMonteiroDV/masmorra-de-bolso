import * as Phaser from 'phaser';
import { Door } from './Door';
import { Enemy } from '../entities/enemies/Enemy';
import { RelicChest } from '../entities/items/RelicChest';

export type RoomType = 'START' | 'COMBAT' | 'TREASURE' | 'BOSS';

export class Room {
  public gridX: number;
  public gridY: number;
  public roomType: RoomType;

  public worldX: number;
  public worldY: number;
  public width: number;
  public height: number;

  public isCleared: boolean = false;
  public isDiscovered: boolean = false;
  public isLockdownActive: boolean = false;

  public doors: Door[] = [];
  public enemies: Enemy[] = [];
  public chest?: RelicChest;

  constructor(
    gridX: number,
    gridY: number,
    roomType: RoomType,
    worldX: number,
    worldY: number,
    width: number,
    height: number
  ) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.roomType = roomType;
    this.worldX = worldX;
    this.worldY = worldY;
    this.width = width;
    this.height = height;

    if (roomType === 'START') {
      this.isCleared = true;
      this.isDiscovered = true;
    }
  }

  public getCenter(): { x: number; y: number } {
    return {
      x: this.worldX + this.width / 2,
      y: this.worldY + this.height / 2
    };
  }

  public containsPoint(x: number, y: number): boolean {
    return (
      x >= this.worldX &&
      x <= this.worldX + this.width &&
      y >= this.worldY &&
      y <= this.worldY + this.height
    );
  }
}
