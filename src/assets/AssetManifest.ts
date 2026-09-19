export const ASSET_KEYS = {
  CHARACTERS: {
    PLAYER: 'char_player',
    SLIME: 'char_slime',
    BAT: 'char_bat',
    MAGE: 'char_mage',
    BOSS: 'char_boss',
    NPC_SHOP: 'char_npc_shop'
  },
  ENVIRONMENT: {
    FLOOR: 'env_floor',
    WALL: 'env_wall',
    DOOR_OPEN: 'env_door_open',
    DOOR_LOCKED: 'env_door_locked',
    CAMPFIRE: 'env_campfire',
    PORTAL: 'env_portal'
  },
  ITEMS: {
    COIN: 'item_coin',
    CHEST: 'item_chest',
    CHEST_OPEN: 'item_chest_open',
    PROJECTILE: 'proj_magic',
    SLASH_FX: 'fx_slash'
  },
  UI: {
    HEART_FULL: 'ui_heart_full',
    HEART_EMPTY: 'ui_heart_empty',
    MINIMAP_ROOM: 'ui_minimap_room',
    MINIMAP_PLAYER: 'ui_minimap_player',
    RELIC_BOOTS: 'relic_boots',
    RELIC_TORCH: 'relic_torch',
    RELIC_VAMPIRE: 'relic_vampire',
    RELIC_RING: 'relic_ring',
    RELIC_CROWN: 'relic_crown'
  }
} as const;

export interface SpriteAssetConfig {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Manifesto central de arquivos reais.
 * O artista só precisa colocar os arquivos nestas rotas.
 */
export const ASSET_FILES: SpriteAssetConfig[] = [
  { key: ASSET_KEYS.CHARACTERS.PLAYER, path: '/assets/sprites/characters/player.png', frameWidth: 16, frameHeight: 16 },
  { key: ASSET_KEYS.CHARACTERS.SLIME, path: '/assets/sprites/characters/slime.png', frameWidth: 16, frameHeight: 16 },
  { key: ASSET_KEYS.CHARACTERS.BAT, path: '/assets/sprites/characters/bat.png', frameWidth: 16, frameHeight: 16 },
  { key: ASSET_KEYS.CHARACTERS.MAGE, path: '/assets/sprites/characters/skeleton.png', frameWidth: 16, frameHeight: 16 },
  { key: ASSET_KEYS.CHARACTERS.BOSS, path: '/assets/sprites/characters/king_slime.png', frameWidth: 32, frameHeight: 32 },
  { key: ASSET_KEYS.ENVIRONMENT.WALL, path: '/assets/sprites/environment/tileset_dungeon.png', frameWidth: 16, frameHeight: 16 },
  { key: ASSET_KEYS.ITEMS.COIN, path: '/assets/sprites/items/coins.png', frameWidth: 16, frameHeight: 16 },
  { key: ASSET_KEYS.ITEMS.CHEST, path: '/assets/sprites/environment/chests.png', frameWidth: 16, frameHeight: 16 }
];
