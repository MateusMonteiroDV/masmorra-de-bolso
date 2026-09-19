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
    description: '+2 HP (+1 Coração) de vida máxima inicial',
    maxLevel: 3,
    costs: [50, 120, 250]
  },
  {
    key: 'damageLevel',
    name: 'Lâmina & Pontaria',
    description: '+25% de dano na espada e nos disparos',
    maxLevel: 4,
    costs: [60, 140, 280, 450]
  },
  {
    key: 'quiverLevel',
    name: 'Aljava Reforçada',
    description: '+5 Flechas extras ao iniciar a Masmorra',
    maxLevel: 3,
    costs: [45, 100, 220]
  },
  {
    key: 'shieldLevel',
    name: 'Bastião de Ferro',
    description: '+25% repulsão contra monstros ao defender',
    maxLevel: 3,
    costs: [40, 90, 190]
  },
  {
    key: 'dashCooldownLevel',
    name: 'Reflexos Ágeis',
    description: '-15% no tempo de recarga da Esquiva',
    maxLevel: 3,
    costs: [45, 110, 230]
  },
  {
    key: 'greedLevel',
    name: 'Olho da Ganância',
    description: '+15% de Ouro obtido em todas as runs',
    maxLevel: 4,
    costs: [50, 120, 250, 400]
  }
];

export class UpgradeSystem {
  public static getUpgradeCost(key: keyof PermanentUpgrades): number | null {
    const def = UPGRADE_DEFINITIONS.find(u => u.key === key);
    if (!def) return null;

    const currentLevel = GameState.upgrades[key];
    if (currentLevel >= def.maxLevel) {
      return null; // Nível Máximo atingido
    }

    return def.costs[currentLevel];
  }

  public static canAfford(key: keyof PermanentUpgrades): boolean {
    const cost = this.getUpgradeCost(key);
    if (cost === null) return false;
    return GameState.bankedGold >= cost;
  }
}
