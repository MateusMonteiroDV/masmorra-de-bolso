/**
 * Layouts das arenas da masmorra (sala principal das ondas e sala do chefe Capetão).
 *
 * Cada arena descreve o polígono de piso caminhável sobre a arte do mapa. As paredes físicas
 * são geradas automaticamente a partir desse polígono (tudo que fica fora dele vira parede),
 * o que permite usar mapas de formato irregular, como o santuário em ruínas do chefe.
 *
 * Este módulo é puro (sem Phaser) para poder ser testado isoladamente.
 */
export interface Point {
  x: number;
  y: number;
}

export interface WallRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArenaLayout {
  key: 'main' | 'boss';
  textureKey: string;
  width: number;
  height: number;
  /** Polígono (sentido horário) onde o corpo físico dos personagens pode ficar */
  floorPolygon: Point[];
  /** Obstáculos sólidos dentro do piso (caixotes, pedestais de tocha) */
  obstacles: WallRect[];
  playerSpawn: Point;
  chestPositions: Point[];
  coinPositions: Point[];
  /** Portal que leva à sala do chefe (apenas na sala principal) */
  bossPortal?: Point & { radius: number };
  bossSpawn?: Point;
  /** Onde o refém fica amarrado (apenas na sala do chefe) */
  hostageSpawn?: Point;
  /** Portal de saída que surge ao lado do refém depois que o chefe cai */
  exitPortal?: Point & { radius: number };
}

export const MAIN_ARENA: ArenaLayout = {
  key: 'main',
  textureKey: 'mapa_sala_principal',
  width: 1254,
  height: 1254,
  floorPolygon: [
    { x: 115, y: 150 },
    { x: 1140, y: 150 },
    { x: 1140, y: 1095 },
    { x: 115, y: 1095 }
  ],
  obstacles: [
    { x: 1045, y: 455, width: 95, height: 135 },  // Caixotes e barril
    { x: 115, y: 335, width: 45, height: 50 },    // Tochas da parede esquerda
    { x: 115, y: 830, width: 45, height: 50 },
    { x: 1095, y: 335, width: 45, height: 50 },   // Tochas da parede direita
    { x: 1095, y: 830, width: 45, height: 50 }
  ],
  playerSpawn: { x: 627, y: 640 },
  chestPositions: [
    { x: 200, y: 1010 },
    { x: 1010, y: 250 }
  ],
  coinPositions: [
    { x: 190, y: 230 },
    { x: 1060, y: 1030 }
  ],
  bossPortal: { x: 627, y: 172, radius: 44 }
};

export const BOSS_ARENA: ArenaLayout = {
  key: 'boss',
  textureKey: 'mapa_sala_chefe',
  width: 1536,
  height: 1024,
  floorPolygon: [
    { x: 200, y: 165 },
    { x: 1330, y: 165 },
    { x: 1345, y: 205 },
    { x: 1335, y: 300 },
    { x: 1400, y: 330 },
    { x: 1460, y: 400 },
    { x: 1470, y: 560 },
    { x: 1420, y: 605 },
    { x: 1395, y: 650 },
    { x: 1340, y: 710 },
    { x: 1280, y: 770 },
    { x: 1190, y: 815 },
    { x: 1090, y: 850 },
    { x: 960, y: 885 },
    { x: 590, y: 885 },
    { x: 460, y: 870 },
    { x: 380, y: 840 },
    { x: 300, y: 800 },
    { x: 230, y: 760 },
    { x: 190, y: 700 },
    { x: 140, y: 645 },
    { x: 60, y: 560 },
    { x: 45, y: 420 },
    { x: 90, y: 390 },
    { x: 190, y: 360 },
    { x: 185, y: 280 },
    { x: 150, y: 240 },
    { x: 160, y: 200 }
  ],
  obstacles: [],
  playerSpawn: { x: 768, y: 800 },
  chestPositions: [],
  coinPositions: [],
  bossSpawn: { x: 768, y: 330 },
  hostageSpawn: { x: 772, y: 188 },  // Topo do santuário, aos pés da estátua
  exitPortal: { x: 840, y: 214, radius: 28 }
};

/** Intervalos [inícioX, fimX] em que a linha horizontal y cruza o interior do polígono */
export function getPolygonSpansAtY(polygon: Point[], y: number): Array<[number, number]> {
  const crossings: number[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];
    const crossesLine = (start.y <= y && end.y > y) || (end.y <= y && start.y > y);
    if (!crossesLine) continue;
    crossings.push(start.x + ((y - start.y) * (end.x - start.x)) / (end.y - start.y));
  }
  crossings.sort((a, b) => a - b);

  const spans: Array<[number, number]> = [];
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    spans.push([crossings[i], crossings[i + 1]]);
  }
  return spans;
}

export function isPointInsidePolygon(polygon: Point[], point: Point): boolean {
  return getPolygonSpansAtY(polygon, point.y).some(([startX, endX]) => point.x >= startX && point.x <= endX);
}

/**
 * Gera retângulos de parede cobrindo tudo o que está fora do polígono de piso.
 * Faixas horizontais consecutivas com o mesmo recorte são fundidas para reduzir corpos físicos.
 */
export function buildWallRects(polygon: Point[], mapWidth: number, mapHeight: number, bandHeight: number = 16): WallRect[] {
  const walls: WallRect[] = [];
  const openWalls = new Map<string, WallRect>();

  for (let bandTop = 0; bandTop < mapHeight; bandTop += bandHeight) {
    const currentBandHeight = Math.min(bandHeight, mapHeight - bandTop);
    const spans = getPolygonSpansAtY(polygon, bandTop + currentBandHeight / 2);

    const bandWalls: Array<[number, number]> = [];
    let cursorX = 0;
    spans.forEach(([startX, endX]) => {
      const floorStart = Math.max(0, Math.round(startX));
      const floorEnd = Math.min(mapWidth, Math.round(endX));
      if (floorStart > cursorX) bandWalls.push([cursorX, floorStart]);
      cursorX = Math.max(cursorX, floorEnd);
    });
    if (cursorX < mapWidth) bandWalls.push([cursorX, mapWidth]);

    const stillOpen = new Set<string>();
    bandWalls.forEach(([startX, endX]) => {
      const wallKey = `${startX}:${endX}`;
      const existing = openWalls.get(wallKey);
      if (existing && existing.y + existing.height === bandTop) {
        existing.height += currentBandHeight;
      } else {
        const wall = { x: startX, y: bandTop, width: endX - startX, height: currentBandHeight };
        walls.push(wall);
        openWalls.set(wallKey, wall);
      }
      stillOpen.add(wallKey);
    });

    Array.from(openWalls.keys()).forEach(wallKey => {
      if (!stillOpen.has(wallKey)) openWalls.delete(wallKey);
    });
  }

  return walls;
}
