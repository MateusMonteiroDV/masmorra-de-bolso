import { PermanentUpgrades, GameState } from '../core/GameState';

export interface UpgradeDefinition {
  key: keyof PermanentUpgrades;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[];
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    key: 'maxHpLevel',
    name: 'Vitalidade do Guerreiro',
    description: '+1 HP de vida máxima inicial por nível (Máx: +5 HP)',
    maxLevel: 5,
    costs: [45, 110, 240, 480, 900]
  },
  {
    key: 'damageLevel',
    name: 'Lâmina & Pontaria',
    description: '+10% de dano na espada e nos disparos (Máx: +50%)',
    maxLevel: 5,
    costs: [55, 130, 280, 560, 1100]
  },
  {
    key: 'quiverLevel',
    name: 'Aljava Reforçada',
    description: '+10 Flechas extras ao iniciar a Masmorra (Máx: +50)',
    maxLevel: 5,
    costs: [35, 85, 190, 400, 750]
  },
  {
    key: 'shieldLevel',
    name: 'Bastião de Ferro',
    description: '+15% repulsão contra monstros ao defender (Máx: +75%)',
    maxLevel: 5,
    costs: [30, 75, 170, 350, 680]
  },
  {
    key: 'dashCooldownLevel',
    name: 'Reflexos Ágeis',
    description: '-8% no tempo de recarga da Esquiva (Máx: -40%)',
    maxLevel: 5,
    costs: [40, 100, 220, 450, 850]
  },
  {
    key: 'greedLevel',
    name: 'Olho da Ganância',
    description: '+10% de Ouro obtido em todas as runs (Máx: +50%)',
    maxLevel: 5,
    costs: [50, 120, 260, 520, 1000]
  }
];

export function getUpgradeCost(key: keyof PermanentUpgrades): number | null {
  const def = UPGRADE_DEFINITIONS.find(u => u.key === key);
  if (!def) return null;
  const currentLevel = GameState.upgrades[key];
  return currentLevel >= def.maxLevel ? null : def.costs[currentLevel];
}

