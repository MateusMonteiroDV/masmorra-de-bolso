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
    costs: [80, 200, 450, 950, 1800]
  },
  {
    key: 'damageLevel',
    name: 'Lâmina & Pontaria',
    description: '+10% de dano na espada e nos disparos (Máx: +50%)',
    maxLevel: 5,
    costs: [100, 250, 550, 1100, 2200]
  },
  {
    key: 'quiverLevel',
    name: 'Aljava Reforçada',
    description: '+3 Flechas extras ao iniciar a Masmorra (Máx: +15)',
    maxLevel: 5,
    costs: [60, 150, 350, 750, 1500]
  },
  {
    key: 'shieldLevel',
    name: 'Bastião de Ferro',
    description: '+15% repulsão contra monstros ao defender (Máx: +75%)',
    maxLevel: 5,
    costs: [50, 130, 300, 650, 1350]
  },
  {
    key: 'dashCooldownLevel',
    name: 'Reflexos Ágeis',
    description: '-8% no tempo de recarga da Esquiva (Máx: -40%)',
    maxLevel: 5,
    costs: [70, 180, 400, 850, 1650]
  },
  {
    key: 'greedLevel',
    name: 'Olho da Ganância',
    description: '+10% de Ouro obtido em todas as runs (Máx: +50%)',
    maxLevel: 5,
    costs: [90, 220, 500, 1000, 2000]
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

  public static calculateTotalInvested(): number {
    let total = 0;
    UPGRADE_DEFINITIONS.forEach(def => {
      const currentLevel = Math.min(def.maxLevel, GameState.upgrades[def.key] ?? 0);
      for (let i = 0; i < currentLevel; i++) {
        total += def.costs[i] ?? 100;
      }
    });
    return total;
  }

  public static refundAllUpgrades(): number {
    const refunded = this.calculateTotalInvested();
    UPGRADE_DEFINITIONS.forEach(def => {
      GameState.upgrades[def.key] = 0;
    });

    GameState.bankedGold += refunded;
    GameState.saveToStorage();
    return refunded;
  }
}
