import { Room, RoomType } from './Room';
import { CONSTANTS } from '../core/Constants';

export interface DungeonLayout {
  gridSize: number;
  rooms: Map<string, Room>;
  startRoom: Room;
  bossRoom: Room;
}

export class DungeonGenerator {
  public static generate(gridSize: number = 3, floorNumber: number = 1): DungeonLayout {
    const roomWidth = 19 * CONSTANTS.TILE_SIZE; // 304 px
    const roomHeight = 13 * CONSTANTS.TILE_SIZE; // 208 px
    const spacingX = 22 * CONSTANTS.TILE_SIZE;  // 352 px
    const spacingY = 16 * CONSTANTS.TILE_SIZE;  // 256 px

    const rooms = new Map<string, Room>();
    const keyOf = (x: number, y: number) => `${x},${y}`;

    // 1. Iniciar no centro do grid
    const startX = Math.floor(gridSize / 2);
    const startY = Math.floor(gridSize / 2);

    const targetRoomCount = 5 + Math.min(3, floorNumber);
    const occupiedCoords: { x: number; y: number }[] = [{ x: startX, y: startY }];

    // Caminhada aleatória para gerar salas conectadas
    while (occupiedCoords.length < targetRoomCount) {
      const current = occupiedCoords[Math.floor(Math.random() * occupiedCoords.length)];
      const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ];

      const dir = directions[Math.floor(Math.random() * directions.length)];
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
        if (!occupiedCoords.some(c => c.x === nx && c.y === ny)) {
          occupiedCoords.push({ x: nx, y: ny });
        }
      }
    }

    // 2. Definir papéis das salas
    // Sala mais distante do início = Chefe
    let maxDist = -1;
    let bossCoord = occupiedCoords[occupiedCoords.length - 1];

    for (const c of occupiedCoords) {
      const dist = Math.abs(c.x - startX) + Math.abs(c.y - startY);
      if (dist > maxDist) {
        maxDist = dist;
        bossCoord = c;
      }
    }

    // Sala de Tesouro = Segunda mais distante que não seja o chefe
    let treasureCoord = occupiedCoords[1];
    let secondDist = -1;
    for (const c of occupiedCoords) {
      if (c === bossCoord || (c.x === startX && c.y === startY)) continue;
      const dist = Math.abs(c.x - startX) + Math.abs(c.y - startY);
      if (dist > secondDist) {
        secondDist = dist;
        treasureCoord = c;
      }
    }

    let startRoom!: Room;
    let bossRoom!: Room;

    // 3. Instanciar as salas
    for (const c of occupiedCoords) {
      let type: RoomType = 'COMBAT';

      if (c.x === startX && c.y === startY) {
        type = 'START';
      } else if (c.x === bossCoord.x && c.y === bossCoord.y) {
        type = 'BOSS';
      } else if (c.x === treasureCoord?.x && c.y === treasureCoord?.y) {
        type = 'TREASURE';
      }

      const worldX = c.x * spacingX;
      const worldY = c.y * spacingY;

      const room = new Room(c.x, c.y, type, worldX, worldY, roomWidth, roomHeight);
      rooms.set(keyOf(c.x, c.y), room);

      if (type === 'START') startRoom = room;
      if (type === 'BOSS') bossRoom = room;
    }

    return {
      gridSize,
      rooms,
      startRoom,
      bossRoom
    };
  }
}
