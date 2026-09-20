import { CONSTANTS } from './Constants';
import { EventBus } from './EventBus';

export interface PermanentUpgrades {
  maxHpLevel: number;       // +1 HP inicial por nível (máx 5)
  damageLevel: number;      // +10% de dano base por nível (máx 5)
  quiverLevel: number;      // +3 flechas iniciais por nível (máx 5)
  shieldLevel: number;      // +15% de repulsão do escudo por nível (máx 5)
  dashCooldownLevel: number;// -8% de recarga do dash por nível (máx 5)
  greedLevel: number;       // +10% de ouro por nível (máx 5)
}

export interface ActiveRelic {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface PlayerStats {
  maxHp: number;
  currentHp: number;
  baseDamage: number;
  arrowDamage: number;
  moveSpeed: number;
  dashCooldown: number;
  goldMultiplier: number;
  burnOnAttack: boolean;
  vampireChance: number; // 0 to 1
  shieldRepulsionMultiplier: number;
}

class GameStateManager {
  // Estado Permanente
  public bankedGold: number = 0;
  public upgrades: PermanentUpgrades = {
    maxHpLevel: 0,
    damageLevel: 0,
    quiverLevel: 0,
    shieldLevel: 0,
    dashCooldownLevel: 0,
    greedLevel: 0
  };
  public totalRuns: number = 0;
  public totalBossKills: number = 0;

  // Estado da Run Atual
  public runGold: number = 0;
  public currentFloor: number = 1;
  public activeRelics: ActiveRelic[] = [];
  public runEnemiesKilled: number = 0;
  public arrows: number = 30;

  constructor() {
    this.loadFromStorage();
  }

  public getComputedPlayerStats(): PlayerStats {
    // Cálculo balanceado com progressão justa por melhoria (5 níveis no total)
    let maxHp = CONSTANTS.PLAYER.BASE_MAX_HP + (this.upgrades.maxHpLevel ?? 0);
    
    // Dano escalado em +10% por nível (até +50% no nível 5)
    const dmgMultiplier = 1 + (this.upgrades.damageLevel ?? 0) * 0.10;
    let baseDamage = CONSTANTS.PLAYER.BASE_ATTACK_DAMAGE * dmgMultiplier;
    let arrowDamage = CONSTANTS.PLAYER.ARROW_DAMAGE * dmgMultiplier;
    
    let moveSpeed = CONSTANTS.PLAYER.DEFAULT_SPEED;
    let dashCooldown = CONSTANTS.PLAYER.DASH_COOLDOWN * (1 - (this.upgrades.dashCooldownLevel ?? 0) * 0.08);
    let goldMultiplier = 1 + (this.upgrades.greedLevel ?? 0) * 0.10;
    let shieldRepulsionMultiplier = 1 + (this.upgrades.shieldLevel ?? 0) * 0.15;

    let burnOnAttack = false;
    let vampireChance = 0;

    // Aplicar efeitos das relíquias ativas
    for (const relic of this.activeRelics) {
      if (relic.id === 'relic_boots') {
        moveSpeed *= 1.25; // +25% velocidade
      } else if (relic.id === 'relic_torch') {
        burnOnAttack = true; // Queimadura nos ataques
      } else if (relic.id === 'relic_vampire') {
        vampireChance += 0.15; // 15% chance de curar ao derrotar inimigo
      } else if (relic.id === 'relic_ring') {
        maxHp += 2; // +2 HP temporário
      } else if (relic.id === 'relic_crown') {
        goldMultiplier += 0.5; // +50% ouro adicional
      }
    }

    return {
      maxHp,
      currentHp: maxHp,
      baseDamage: Number(baseDamage.toFixed(1)),
      arrowDamage: Number(arrowDamage.toFixed(1)),
      moveSpeed: Math.round(moveSpeed),
      dashCooldown: Math.max(300, Math.round(dashCooldown)),
      goldMultiplier,
      burnOnAttack,
      vampireChance,
      shieldRepulsionMultiplier
    };
  }

  public startNewRun() {
    this.totalRuns++;
    this.runGold = 0;
    this.activeRelics = [];
    this.runEnemiesKilled = 0;
    this.currentFloor = 1;
    this.arrows = 30 + (this.upgrades.quiverLevel ?? 0) * 3;
    this.saveToStorage();
    EventBus.emit(CONSTANTS.EVENTS.PLAYER_GOLD_CHANGED, this.runGold);
    EventBus.emit(CONSTANTS.EVENTS.PLAYER_ARROWS_CHANGED, this.arrows);
  }

  public useArrow(): boolean {
    if (this.arrows > 0) {
      this.arrows--;
      EventBus.emit(CONSTANTS.EVENTS.PLAYER_ARROWS_CHANGED, this.arrows);
      return true;
    }
    return false;
  }

  public addArrows(count: number = 1) {
    this.arrows += count;
    EventBus.emit(CONSTANTS.EVENTS.PLAYER_ARROWS_CHANGED, this.arrows);
  }

  public addRunGold(amount: number) {
    const multiplier = this.getComputedPlayerStats().goldMultiplier;
    const gained = Math.round(amount * multiplier);
    this.runGold += gained;
    EventBus.emit(CONSTANTS.EVENTS.PLAYER_GOLD_CHANGED, this.runGold);
  }

  public addRelic(relic: ActiveRelic) {
    this.activeRelics.push(relic);
    EventBus.emit(CONSTANTS.EVENTS.RELIC_ACQUIRED, relic);
  }

  public endRun(victory: boolean = false) {
    // Na morte ou vitória, transfere o ouro da run para o ouro guardado na base!
    this.bankedGold += this.runGold;
    this.runGold = 0; // Limpa o ouro temporário para evitar transferências duplicadas
    if (victory) {
      this.totalBossKills++;
    }
    this.saveToStorage();
  }

  public spendBankedGold(amount: number): boolean {
    if (this.bankedGold >= amount) {
      this.bankedGold -= amount;
      this.saveToStorage();
      EventBus.emit(CONSTANTS.EVENTS.PLAYER_GOLD_CHANGED, this.bankedGold);
      return true;
    }
    return false;
  }

  public purchaseUpgrade(type: keyof PermanentUpgrades, cost: number): boolean {
    if (this.spendBankedGold(cost)) {
      this.upgrades[type]++;
      this.saveToStorage();
      EventBus.emit(CONSTANTS.EVENTS.UPGRADE_PURCHASED, type, this.upgrades[type]);
      return true;
    }
    return false;
  }

  public saveToStorage() {
    try {
      const data = {
        bankedGold: this.bankedGold,
        upgrades: this.upgrades,
        totalRuns: this.totalRuns,
        totalBossKills: this.totalBossKills
      };
      localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Não foi possível salvar no localStorage:', e);
    }
  }

  public loadFromStorage() {
    try {
      const raw = localStorage.getItem(CONSTANTS.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.bankedGold = parsed.bankedGold ?? 0;
        this.upgrades = { ...this.upgrades, ...parsed.upgrades };
        this.totalRuns = parsed.totalRuns ?? 0;
        this.totalBossKills = parsed.totalBossKills ?? 0;
      }
    } catch (e) {
      console.warn('Erro ao carregar do localStorage, usando valores padrão:', e);
    }
  }
}

export const GameState = new GameStateManager();
