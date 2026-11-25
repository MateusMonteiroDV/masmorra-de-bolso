import { CONSTANTS } from '../core/Constants';

/** Ouro bônus por concluir a onda (cresce com a onda para recompensar o progresso) */
export function getWaveClearBonus(waveNumber: number): number {
  return CONSTANTS.ECONOMY.WAVE_CLEAR_BONUS_BASE + waveNumber * CONSTANTS.ECONOMY.WAVE_CLEAR_BONUS_PER_WAVE;
}

export interface WaveConfig {
  waveNumber: number;
  title: string;
  slimes: { x: number; y: number }[];
  bats?: { x: number; y: number }[];
  mages: { x: number; y: number }[];
  minotaurs?: { x: number; y: number }[];
  hasBoss?: boolean;
  bossPos?: { x: number; y: number };
  hpMult?: number;
  speedMult?: number;
  damageMult?: number;
  goldMult?: number;
}

export const WAVE_CONFIGS: WaveConfig[] = [
  {
    waveNumber: 1,
    title: 'ONDA 1/8: O DESPERTAR DOS SLIMES',
    slimes: [
      { x: 627, y: 462 },
      { x: 497, y: 630 },
      { x: 757, y: 630 },
      { x: 627, y: 822 },
      { x: 437, y: 522 }
    ],
    mages: [],
    hpMult: 1.0,
    speedMult: 1.0,
    damageMult: 1.0,
    goldMult: 1.0
  },
  {
    waveNumber: 2,
    title: 'ONDA 2/8: A REVOADA DAS SOMBRAS',
    slimes: [
      { x: 457, y: 482 },
      { x: 797, y: 482 },
      { x: 457, y: 782 },
      { x: 797, y: 782 },
      { x: 627, y: 862 }
    ],
    bats: [
      { x: 377, y: 402 },
      { x: 877, y: 402 },
      { x: 627, y: 392 }
    ],
    mages: [],
    hpMult: 1.1,
    speedMult: 1.04,
    damageMult: 1.0,
    goldMult: 1.2
  },
  {
    waveNumber: 3,
    title: 'ONDA 3/8: A CONJURAÇÃO DAS RUÍNAS',
    slimes: [
      { x: 377, y: 442 },
      { x: 877, y: 442 },
      { x: 377, y: 822 },
      { x: 877, y: 822 },
      { x: 627, y: 442 },
      { x: 627, y: 842 }
    ],
    bats: [
      { x: 317, y: 630 },
      { x: 937, y: 630 },
      { x: 627, y: 362 }
    ],
    mages: [
      { x: 817, y: 382 },
      { x: 437, y: 882 }
    ],
    hpMult: 1.2,
    speedMult: 1.07,
    damageMult: 1.0,
    goldMult: 1.4
  },
  {
    waveNumber: 4,
    title: 'ONDA 4/8: O CERCO DAS CATACUMBAS',
    slimes: [
      { x: 337, y: 462 },
      { x: 917, y: 462 },
      { x: 337, y: 822 },
      { x: 917, y: 822 },
      { x: 497, y: 542 },
      { x: 757, y: 542 }
    ],
    bats: [
      { x: 407, y: 392 },
      { x: 847, y: 392 },
      { x: 407, y: 892 },
      { x: 847, y: 892 }
    ],
    mages: [
      { x: 897, y: 372 },
      { x: 357, y: 892 }
    ],
    hpMult: 1.3,
    speedMult: 1.1,
    damageMult: 1.2,
    goldMult: 1.6
  },
  {
    waveNumber: 5,
    title: 'ONDA 5/8: FRENESI DOS MONSTROS',
    slimes: [
      { x: 317, y: 422 },
      { x: 937, y: 422 },
      { x: 317, y: 942 },
      { x: 937, y: 942 },
      { x: 457, y: 630 },
      { x: 797, y: 630 }
    ],
    bats: [
      { x: 357, y: 492 },
      { x: 897, y: 492 },
      { x: 357, y: 792 },
      { x: 897, y: 792 }
    ],
    mages: [
      { x: 877, y: 362 },
      { x: 337, y: 902 },
      { x: 917, y: 842 }
    ],
    hpMult: 1.4,
    speedMult: 1.12,
    damageMult: 1.2,
    goldMult: 1.8
  },
  {
    waveNumber: 6,
    title: 'ONDA 6/8: A INVESTIDA DO MINOTAURO',
    minotaurs: [
      { x: 627, y: 462 }
    ],
    slimes: [
      { x: 297, y: 402 },
      { x: 957, y: 402 },
      { x: 297, y: 962 },
      { x: 957, y: 962 }
    ],
    bats: [
      { x: 307, y: 522 },
      { x: 947, y: 522 },
      { x: 627, y: 912 }
    ],
    mages: [
      { x: 897, y: 342 },
      { x: 357, y: 942 }
    ],
    hpMult: 1.5,
    speedMult: 1.14,
    damageMult: 1.3,
    goldMult: 2.0
  },
  {
    waveNumber: 7,
    title: 'ONDA 7/8: A FÚRIA DOS MINOTAUROS',
    minotaurs: [
      { x: 417, y: 542 },
      { x: 837, y: 542 }
    ],
    slimes: [
      { x: 277, y: 382 },
      { x: 977, y: 382 },
      { x: 277, y: 982 },
      { x: 977, y: 982 }
    ],
    bats: [
      { x: 257, y: 630 },
      { x: 997, y: 630 },
      { x: 437, y: 342 },
      { x: 817, y: 342 }
    ],
    mages: [
      { x: 937, y: 362 },
      { x: 317, y: 922 }
    ],
    hpMult: 1.6,
    speedMult: 1.16,
    damageMult: 1.3,
    goldMult: 2.3
  },
  {
    waveNumber: 8,
    title: 'ONDA 8/8: O DESPERTAR DO REI SLIME',
    hasBoss: true,
    bossPos: { x: 627, y: 422 },
    minotaurs: [
      { x: 627, y: 862 }
    ],
    slimes: [
      { x: 477, y: 522 },
      { x: 777, y: 522 },
      { x: 477, y: 762 },
      { x: 777, y: 762 }
    ],
    bats: [
      { x: 417, y: 402 },
      { x: 837, y: 402 }
    ],
    mages: [
      { x: 917, y: 362 },
      { x: 337, y: 922 }
    ],
    hpMult: 1.75,
    speedMult: 1.18,
    damageMult: 1.3,
    goldMult: 2.6
  }
];
