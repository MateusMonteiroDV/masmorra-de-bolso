export const CONSTANTS = {
  // Resolução Base e Dimensões do Mapa
  GAME_WIDTH: 480,
  GAME_HEIGHT: 270,
  TILE_SIZE: 16,

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
    BASE_ARROWS: 100,          // Flechas iniciais do Roberto (100)
    DEFAULT_SPEED: 110,
    DASH_SPEED: 260,
    DASH_DURATION: 180,
    DASH_COOLDOWN: 700,
    INVULNERABLE_DURATION: 900,
    ACCELERATION: 14,          // Resposta da aceleração (maior = mais responsivo)
    DECELERATION: 18,          // Frenagem ao soltar o direcional
    WAVE_CLEAR_HEAL: 3,        // Vida recuperada ao concluir cada onda
    ATTACK_COOLDOWN: 380,
    BOW_COOLDOWN: 450,
    ATTACK_RANGE: 32
  },

  // Atributos dos Monstros Hostis (Dano de 0 a 10, vida variada, Slime mais fraco)
  ENEMIES: {
    SLIME: {
      HP: 4,                   // Mais fraco (morre em 2 tiros de flecha)
      SPEED: 42,
      DAMAGE: 1,               // Dano pré-definido (1 a 10)
      XP_OR_GOLD: 2            // 2 moedas
    },
    BAT: {
      HP: 1,                   // Morre com um único golpe
      SPEED: 72,
      DAMAGE: 1,
      XP_OR_GOLD: 2            // 2 moedas
    },
    MAGE: {
      HP: 8,                   // Conjurador à distância (4 tiros de flecha)
      SPEED: 38,
      DAMAGE: 2,
      ATTACK_RANGE: 160,
      COOLDOWN: 2800,
      PROJECTILE_SPEED: 80,
      XP_OR_GOLD: 4            // 4 moedas
    },
    MINOTAUR: {
      HP: 16,                  // Elite brutal (8 tiros de flecha ou golpes de espada)
      SPEED: 48,
      DAMAGE: 3,               // Dano do golpe pesado de machado
      CHARGE_SPEED: 110,       // Velocidade na investida furiosa
      CHARGE_COOLDOWN: 5500,   // Cooldown entre investidas
      ATTACK_RANGE: 44,        // Alcance de corte do machado
      ATTACK_COOLDOWN: 1600,   // Cooldown do machado
      XP_OR_GOLD: 8            // 8 moedas de recompensa
    },
    BOSS: {
      HP: 24,                  // Chefe / Monstro forte (12 tiros de flecha)
      SPEED: 32,
      DAMAGE: 3,
      SLAM_DAMAGE: 3,
      SLAM_COOLDOWN: 4500,
      XP_OR_GOLD: 20           // 20 moedas de recompensa
    },
    CAPETAO: {
      HP: 150,                 // Chefe final da Sala do Capetão
      HP_PER_EXTRA_PLAYER: 0.6,// +60% de vida por aliado conectado
      SPEED: 46,
      ENRAGED_SPEED: 60,       // Velocidade na fase 2 (abaixo de 50% de vida)
      SCALE: 2,                // Escala inteira mantém os pixels nítidos
      CLAW_DAMAGE: 2,
      CLAW_RANGE: 50,
      CLAW_COOLDOWN: 1400,
      FIRE_DAMAGE: 2,
      FIRE_COOLDOWN: 3600,
      FIRE_RANGE: 230,
      FIRE_PROJECTILE_SPEED: 120,
      RING_COOLDOWN: 7000,
      CONTACT_DAMAGE: 1,
      XP_OR_GOLD: 40           // 40 moedas de recompensa
    }
  },

  // Chaves de Eventos do EventBus
  EVENTS: {
    PLAYER_HEALTH_CHANGED: 'player:health_changed',
    PLAYER_GOLD_CHANGED: 'player:gold_changed',
    PLAYER_DIED: 'player:died',
    ENEMY_DIED: 'enemy:died',
    RELIC_ACQUIRED: 'relic:acquired',
    REQUEST_RELIC_CHOICE: 'ui:request_relic_choice',
    PLAYER_ARROWS_CHANGED: 'player:arrows_changed',
    WAVE_CHANGED: 'wave:changed',
    WAVES_CLEARED: 'wave:all_cleared',
    CHEST_SPAWN_REQUESTED: 'chest:spawn_requested',
    BOSS_HEALTH_CHANGED: 'boss:health_changed',
    WAVE_CLEAR_REWARD: 'wave:clear_reward'
  },

  ECONOMY: {
    MAX_COINS_PER_DROP: 6,     // Recompensas maiores viram moedas de valor maior (menos sprites)
    WAVE_CLEAR_BONUS_BASE: 5,  // Bônus de ouro ao concluir uma onda
    WAVE_CLEAR_BONUS_PER_WAVE: 3
  },

  STORAGE_KEY: 'masmorra_de_bolso_save_v1'
} as const;

