export const CONSTANTS = {
  // Resolução Base e Dimensões do Mapa
  GAME_WIDTH: 480,
  GAME_HEIGHT: 270,
  MAP_WIDTH: 1140,
  MAP_HEIGHT: 977,
  TILE_SIZE: 16,
  ZOOM: 1.8,

  // Profundidade de Renderização (Z-Index)
  DEPTH: {
    BACKGROUND: 0,
    FLOOR: 0,
    DECORATION: 5,
    DOORS: 8,
    WALLS: 10,
    CHESTS: 15,
    DROPS: 20,
    CHARACTERS: 30,
    PROJECTILES: 40,
    EFFECTS: 50,
    UI: 100,
    MODAL: 200
  },

  // Atributos do Jogador Roberto
  PLAYER: {
    BASE_MAX_HP: 10,           // Vida inicial solicitada: 10 HP
    BASE_ATTACK_DAMAGE: 2,      // Dano inicial solicitado: 2
    ARROW_SPEED: 280,           // Velocidade do projétil da flecha
    ARROW_DAMAGE: 2,           // Dano inicial da flecha: 2
    ARROW_KNOCKBACK: 85,       // Deslocamento para trás ao acertar inimigo
    DEFAULT_SPEED: 110,
    DASH_SPEED: 260,
    DASH_DURATION: 180,
    DASH_COOLDOWN: 700,
    INVULNERABLE_DURATION: 700,
    DEFENSE_REDUCTION: 0.8,    // 80% de absorção de dano na defesa com escudo
    ATTACK_COOLDOWN: 380,
    BOW_COOLDOWN: 450,
    ATTACK_RANGE: 32
  },

  // Atributos dos Monstros Hostis (Dano de 0 a 10, vida variada, Slime mais fraco)
  ENEMIES: {
    SLIME: {
      HP: 4,                   // Mais fraco (morre em 2 tiros de flecha)
      SPEED: 45,
      DAMAGE: 1,               // Dano pré-definido (1 a 10)
      XP_OR_GOLD: 1            // Chance de drop de 1 moeda
    },
    BAT: {
      HP: 6,                   // Médio ágil (3 tiros de flecha)
      SPEED: 80,
      DAMAGE: 2,
      XP_OR_GOLD: 1            // 1 moeda
    },
    MAGE: {
      HP: 8,                   // Conjurador à distância (4 tiros de flecha)
      SPEED: 38,
      DAMAGE: 3,
      ATTACK_RANGE: 160,
      COOLDOWN: 2200,
      PROJECTILE_SPEED: 80,
      XP_OR_GOLD: 2            // 2 moedas
    },
    BOSS: {
      HP: 24,                  // Chefe / Monstro forte (12 tiros de flecha)
      SPEED: 32,
      DAMAGE: 5,
      SLAM_DAMAGE: 5,
      SLAM_COOLDOWN: 4000,
      XP_OR_GOLD: 6            // 6 moedas de recompensa
    }
  },

  // Chaves de Eventos do EventBus
  EVENTS: {
    PLAYER_HEALTH_CHANGED: 'player:health_changed',
    PLAYER_GOLD_CHANGED: 'player:gold_changed',
    PLAYER_DASHED: 'player:dashed',
    PLAYER_DIED: 'player:died',
    ENEMY_DIED: 'enemy:died',
    ROOM_ENTERED: 'room:entered',
    ROOM_LOCKDOWN_START: 'room:lockdown_start',
    ROOM_LOCKDOWN_END: 'room:lockdown_end',
    RELIC_ACQUIRED: 'relic:acquired',
    REQUEST_RELIC_CHOICE: 'ui:request_relic_choice',
    OPEN_SHOP: 'ui:open_shop',
    CLOSE_SHOP: 'ui:close_shop',
    UPGRADE_PURCHASED: 'hub:upgrade_purchased',
    PLAYER_ARROWS_CHANGED: 'player:arrows_changed',
    WAVE_CHANGED: 'wave:changed',
    WAVE_COMPLETED: 'wave:completed'
  },

  STORAGE_KEY: 'masmorra_de_bolso_save_v1'
} as const;
