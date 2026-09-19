import { ActiveRelic } from '../core/GameState';
import { ASSET_KEYS } from '../assets/AssetManifest';

export const ALL_RELICS: ActiveRelic[] = [
  {
    id: 'relic_boots',
    name: 'Botas de Mercúrio',
    description: '+25% de Velocidade de Movimento',
    icon: ASSET_KEYS.UI.RELIC_BOOTS
  },
  {
    id: 'relic_torch',
    name: 'Tocha Ancestral',
    description: 'Golpes causam Chamas (+6 dano de fogo)',
    icon: ASSET_KEYS.UI.RELIC_TORCH
  },
  {
    id: 'relic_vampire',
    name: 'Amuleto Vampírico',
    description: '15% de chance de curar ao matar monstros',
    icon: ASSET_KEYS.UI.RELIC_VAMPIRE
  },
  {
    id: 'relic_ring',
    name: 'Anel do Titã',
    description: '+1 Coração de Vida Máxima na run',
    icon: ASSET_KEYS.UI.RELIC_RING
  },
  {
    id: 'relic_crown',
    name: 'Coroa da Cobiça',
    description: '+50% de Ouro obtido de monstros',
    icon: ASSET_KEYS.UI.RELIC_CROWN
  }
];

export class RelicSystem {
  public static getRandomRelicChoices(count: number = 3, excludeIds: string[] = []): ActiveRelic[] {
    const pool = ALL_RELICS.filter(r => !excludeIds.includes(r.id));

    // Embaralhar aleatoriamente
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}
