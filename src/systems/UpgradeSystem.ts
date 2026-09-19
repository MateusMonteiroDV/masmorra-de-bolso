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
    costs: [25, 50, 90]
  },
  {
    key: 'damageLevel',
    name: 'Lâmina & Pontaria',
    description: '+25% de dano na espada e nos disparos',
    maxLevel: 4,
    costs: [25, 45, 75, 120]
  },
  {
    key: 'quiverLevel',
    name: 'Aljava Reforçada',
    description: '+5 Flechas extras ao iniciar a Masmorra',
    maxLevel: 3,
    costs: [20, 40, 75]
  },
  {
    key: 'shieldLevel',
    name: 'Bastião de Ferro',
    description: '+25% repulsão contra monstros ao defender',
    maxLevel: 3,
    costs: [20, 45, 80]
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
    description: '+20% de Ouro obtido em todas as runs',
    maxLevel: 4,
    costs: [20, 40, 70, 110]
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
