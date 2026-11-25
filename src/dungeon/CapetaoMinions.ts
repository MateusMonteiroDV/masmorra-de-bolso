import { CONSTANTS } from '../core/Constants';
import { Point } from './ArenaLayouts';

/**
 * Hordas de lacaios da Sala do Capetão: enquanto o chefe estiver vivo, monstros comuns
 * continuam surgindo nas bordas do santuário.
 *
 * Este módulo é puro (sem Phaser) para poder ser testado isoladamente. A composição e os
 * pontos são determinísticos para que todos os jogadores do co-op gerem os mesmos lacaios.
 */
export type CapetaoMinionKind = 'slime' | 'bat' | 'mage';

export interface CapetaoMinionSpawn extends Point {
  kind: CapetaoMinionKind;
}

/** Pontos de invocação nas bordas do santuário (alternando os lados para cercar o herói) */
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

/**
 * Decide quais lacaios nascem na horda `hordeNumber` (começa em 1).
 * Respeita o limite de lacaios vivos e evita pontos colados nos heróis.
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

  return kinds.map((kind, index) => {
    const point = points[(hordeIndex + index) % points.length];
    return { kind, x: point.x, y: point.y };
  });
}
