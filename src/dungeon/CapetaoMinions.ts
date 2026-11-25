import { CONSTANTS } from '../core/Constants';
import { BOSS_ARENA, Point, isPointInsidePolygon } from './ArenaLayouts';

/**
 * Hordas de lacaios da Sala do Capetão: enquanto o chefe estiver vivo, monstros comuns
 * continuam surgindo em volta dos heróis (perto o bastante para aparecerem na tela).
 *
 * Este módulo é puro (sem Phaser) para poder ser testado isoladamente. A composição e os
 * pontos são determinísticos para que todos os jogadores do co-op gerem os mesmos lacaios.
 */
export type CapetaoMinionKind = 'slime' | 'bat' | 'mage';

export interface CapetaoMinionSpawn extends Point {
  kind: CapetaoMinionKind;
}

/** Pontos de reserva nas bordas do santuário, usados quando não há espaço livre em volta do herói */
export const CAPETAO_MINION_SPAWN_POINTS: Point[] = [
  { x: 330, y: 260 },
  { x: 1120, y: 760 },
  { x: 1380, y: 480 },
  { x: 160, y: 480 },
  { x: 1200, y: 260 },
  { x: 420, y: 760 }
];

/** Composição de cada horda; a lista se repete em ciclo até o Capetão morrer */
export const CAPETAO_MINION_HORDES: CapetaoMinionKind[][] = [
  ['slime', 'slime', 'bat'],
  ['bat', 'bat', 'slime'],
  ['slime', 'mage', 'bat']
];

/** Intervalo até a próxima horda: mais curto quando o Capetão está em fúria */
export function getCapetaoHordeInterval(isEnraged: boolean): number {
  const stats = CONSTANTS.ENEMIES.CAPETAO;
  return isEnraged ? stats.MINION_ENRAGED_INTERVAL : stats.MINION_INTERVAL;
}

const RING_STEPS = 12;

/** Ponto no piso, a uma distância segura de todos os heróis */
function isValidSpawn(point: Point, heroPositions: Point[]): boolean {
  const safeDistance = CONSTANTS.ENEMIES.CAPETAO.MINION_SAFE_DISTANCE;
  // Margem para o corpo do monstro não nascer encostado na parede
  const margin = 24;
  const fitsOnFloor = [
    point,
    { x: point.x - margin, y: point.y },
    { x: point.x + margin, y: point.y },
    { x: point.x, y: point.y - margin },
    { x: point.x, y: point.y + margin }
  ].every(corner => isPointInsidePolygon(BOSS_ARENA.floorPolygon, corner));
  return fitsOnFloor && heroPositions.every(hero => Math.hypot(hero.x - point.x, hero.y - point.y) >= safeDistance);
}

/** Procura um ponto livre no anel em volta do herói, começando pelo ângulo pedido */
function findRingSpawn(anchor: Point, startStep: number, heroPositions: Point[], taken: Point[]): Point | undefined {
  const radius = CONSTANTS.ENEMIES.CAPETAO.MINION_SPAWN_RADIUS;
  for (let offset = 0; offset < RING_STEPS; offset++) {
    const angle = ((startStep + offset) % RING_STEPS) * ((Math.PI * 2) / RING_STEPS);
    const point = {
      x: Math.round(anchor.x + Math.cos(angle) * radius),
      y: Math.round(anchor.y + Math.sin(angle) * radius)
    };
    const isFree = taken.every(other => Math.hypot(other.x - point.x, other.y - point.y) > 40);
    if (isFree && isValidSpawn(point, heroPositions)) return point;
  }
  return undefined;
}

/**
 * Decide quais lacaios nascem na horda `hordeNumber` (começa em 1).
 * Respeita o limite de lacaios vivos; eles surgem cercando um herói (alternado a cada horda),
 * sempre no piso e nunca colados em ninguém.
 */
export function planCapetaoHorde(hordeNumber: number, aliveMinions: number, heroPositions: Point[]): CapetaoMinionSpawn[] {
  const stats = CONSTANTS.ENEMIES.CAPETAO;
  const hordeIndex = Math.max(0, hordeNumber - 1);
  const freeSlots = Math.max(0, stats.MINION_MAX_ALIVE - aliveMinions);
  const kinds = CAPETAO_MINION_HORDES[hordeIndex % CAPETAO_MINION_HORDES.length].slice(0, freeSlots);

  const safePoints = CAPETAO_MINION_SPAWN_POINTS.filter(point =>
    heroPositions.every(hero => Math.hypot(hero.x - point.x, hero.y - point.y) >= stats.MINION_SAFE_DISTANCE)
  );
  const points = safePoints.length > 0 ? safePoints : CAPETAO_MINION_SPAWN_POINTS;

  const anchor = heroPositions.length > 0 ? heroPositions[hordeIndex % heroPositions.length] : undefined;
  const taken: Point[] = [];

  return kinds.map((kind, index) => {
    // Lacaios da mesma horda ficam espalhados pelo anel (um terço de volta entre cada um)
    const startStep = hordeIndex * 5 + index * (RING_STEPS / 3);
    const point = (anchor && findRingSpawn(anchor, startStep, heroPositions, taken))
      ?? points[(hordeIndex + index) % points.length];
    taken.push(point);
    return { kind, x: point.x, y: point.y };
  });
}
