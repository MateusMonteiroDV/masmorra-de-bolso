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
    description: '+1 Coração de vida máxima inicial',
    maxLevel: 3,
    costs: [15, 30, 60]
  },
  {
    key: 'damageLevel',
    name: 'Lâmina Afiada',
    description: '+20% de dano base no golpe',
    maxLevel: 5,
    costs: [10, 20, 35, 55, 80]
  },
  {
    key: 'dashCooldownLevel',
    name: 'Reflexos Ágeis',
    description: '-15% no tempo de recarga da Esquiva',
    maxLevel: 3,
    costs: [20, 45, 80]
  },
  {
    key: 'greedLevel',
    name: 'Olho da Ganância',
    description: '+25% de Ouro obtido em todas as runs',
    maxLevel: 4,
    costs: [15, 30, 50, 75]
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
