import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { EventBus } from '../core/EventBus';
import { Enemy } from '../entities/enemies/Enemy';
import { SlimeEnemy } from '../entities/enemies/SlimeEnemy';
import { SkeletonMage } from '../entities/enemies/SkeletonMage';
import { BatEnemy } from '../entities/enemies/BatEnemy';
import { KingSlimeBoss } from '../entities/enemies/KingSlimeBoss';
import { MinotaurEnemy } from '../entities/enemies/MinotaurEnemy';
import { NetworkManager } from '../network/NetworkManager';
import { GameState } from '../core/GameState';
import { WAVE_CONFIGS, getWaveClearBonus } from './WaveConfigs';

export class WaveManager {
  private scene: Phaser.Scene;
  private enemyGroup: Phaser.GameObjects.Group;
  private dropGroup: Phaser.GameObjects.Group;
  private projectileGroup: Phaser.GameObjects.Group;
  private enemyMap: Map<string, Enemy>;

  public currentWave: number = 0;
  public totalWaves: number = WAVE_CONFIGS.length;
  public remainingEnemies: number = 0;
  public allWavesCleared: boolean = false;
  private isTransitioning: boolean = false;


  constructor(
    scene: Phaser.Scene,
    enemyGroup: Phaser.GameObjects.Group,
    dropGroup: Phaser.GameObjects.Group,
    projectileGroup: Phaser.GameObjects.Group,
    enemyMap: Map<string, Enemy>
  ) {
    this.scene = scene;
    this.enemyGroup = enemyGroup;
    this.dropGroup = dropGroup;
    this.projectileGroup = projectileGroup;
    this.enemyMap = enemyMap;
  }

  public start() {
    this.currentWave = 0;
    this.allWavesCleared = false;
    this.nextWave();
  }

  public nextWave() {
    if (this.currentWave >= this.totalWaves || this.allWavesCleared) return;

    this.currentWave++;
    this.isTransitioning = false;
    const config = WAVE_CONFIGS[this.currentWave - 1];

    // Limpa mapa de inimigos da onda anterior
    this.enemyMap.clear();

    // Banner de Início da Onda
    this.showWaveBanner(config.title);

    let spawnedCount = 0;
    const hpMult = config.hpMult ?? 1;
    const speedMult = config.speedMult ?? 1;
    const damageMult = config.damageMult ?? 1;
    const goldMult = config.goldMult ?? 1;

    const spawnBatch = (
      positions: { x: number; y: number }[] | undefined,
      prefix: string,
      createFn: (pos: { x: number; y: number }) => Enemy,
      scaleHp: number = hpMult
    ) => {
      positions?.forEach((pos, idx) => {
        const id = `w${this.currentWave}_${prefix}_${idx}`;
        this.spawnSpawnCloud(pos.x, pos.y);
        const enemy = createFn(pos);
        enemy.setData('networkId', id);
        enemy.applyDifficultyScale(scaleHp, speedMult, damageMult, goldMult);
        this.enemyGroup.add(enemy);
        this.enemyMap.set(id, enemy);
        spawnedCount++;
      });
    };

    spawnBatch(config.slimes, 'slime', pos => new SlimeEnemy(this.scene, pos.x, pos.y, this.dropGroup));
    spawnBatch(config.bats, 'bat', pos => new BatEnemy(this.scene, pos.x, pos.y, this.dropGroup), 1);
    spawnBatch(config.mages, 'mage', pos => new SkeletonMage(this.scene, pos.x, pos.y, this.dropGroup, this.projectileGroup));
    spawnBatch(config.minotaurs, 'minotaur', pos => new MinotaurEnemy(this.scene, pos.x, pos.y, this.dropGroup));

    if (config.hasBoss && config.bossPos) {
      spawnBatch([config.bossPos], 'boss', pos => new KingSlimeBoss(this.scene, pos.x, pos.y, this.dropGroup, this.enemyGroup));
    }

    this.remainingEnemies = spawnedCount;
    this.emitWaveUpdate();

    if (NetworkManager.isHost && NetworkManager.isConnected()) {
      NetworkManager.sendAction({
        type: 'scene_sync',
        payload: { wave: this.currentWave }
      });
    }
  }

  public onEnemyKilled(deadEnemy: Enemy) {
    if (this.isTransitioning || this.allWavesCleared) return;

    if (deadEnemy.getData('isMinion')) return;

    this.remainingEnemies = Math.max(0, this.remainingEnemies - 1);
    this.emitWaveUpdate();

    if (this.remainingEnemies <= 0) {
      this.isTransitioning = true;
      this.grantWaveClearReward();

      if (this.currentWave >= this.totalWaves) {
        this.allWavesCleared = true;
        this.showWaveBanner('👑 AS 8 ONDAS FORAM VENCIDAS! O PORTAL DO CAPETÃO SE ABRIU!', true);
        EventBus.emit(CONSTANTS.EVENTS.WAVES_CLEARED);
      } else {
        const nextWave = this.currentWave + 1;
        const bannerText = nextWave === this.totalWaves
          ? `✨ ONDA ${this.currentWave}/${this.totalWaves} CONCLUÍDA! O REI SLIME SE APROXIMA!`
          : `✨ ONDA ${this.currentWave}/${this.totalWaves} CONCLUÍDA!`;

        this.showWaveBanner(bannerText, false);

        // Só avança se ninguém (ex.: sincronização do host) já tiver avançado a onda nesse meio-tempo
        const finishedWave = this.currentWave;
        this.scene.time.delayedCall(3000, () => {
          if (this.currentWave === finishedWave) {
            this.nextWave();
          }
        });
      }
    }
  }

  /** Recompensa de onda concluída: bônus de ouro e um pouco de vida (ajuda quem joga sozinho) */
  private grantWaveClearReward() {
    const bonusGold = getWaveClearBonus(this.currentWave);
    GameState.addRunGold(bonusGold);
    EventBus.emit(CONSTANTS.EVENTS.WAVE_CLEAR_REWARD, { wave: this.currentWave, bonusGold });
  }

  private emitWaveUpdate() {
    EventBus.emit(CONSTANTS.EVENTS.WAVE_CHANGED, {
      wave: this.currentWave,
      total: this.totalWaves,
      remaining: this.remainingEnemies
    });
  }

  private spawnSpawnCloud(x: number, y: number) {
    const cloud = this.scene.add.sprite(x, y, 'nuvem_0');
    cloud.setDepth(CONSTANTS.DEPTH.EFFECTS);
    cloud.play('anim_nuvem');
    cloud.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      cloud.destroy();
    });
  }

  private showWaveBanner(text: string, isBig: boolean = false) {
    const banner = this.scene.add.text(
      this.scene.scale.width / 2,
      isBig ? 68 : 52,
      text,
      {
        fontFamily: 'monospace',
        fontSize: isBig ? '12px' : '9px',
        color: isBig ? '#fbbf24' : '#38bdf8',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(CONSTANTS.DEPTH.UI + 20);

    this.scene.tweens.add({
      targets: banner,
      y: banner.y - 12,
      alpha: 0,
      delay: 2000,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => banner.destroy()
    });
  }
}
