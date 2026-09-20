import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { EventBus } from '../core/EventBus';
import { Enemy } from '../entities/enemies/Enemy';
import { SlimeEnemy } from '../entities/enemies/SlimeEnemy';
import { SkeletonMage } from '../entities/enemies/SkeletonMage';
import { KingSlimeBoss } from '../entities/enemies/KingSlimeBoss';
import { NetworkManager } from '../network/NetworkManager';

export interface WaveConfig {
  waveNumber: number;
  title: string;
  slimes: { x: number; y: number }[];
  mages: { x: number; y: number }[];
  hasBoss?: boolean;
  bossPos?: { x: number; y: number };
}

export class WaveManager {
  private scene: Phaser.Scene;
  private enemyGroup: Phaser.GameObjects.Group;
  private dropGroup: Phaser.GameObjects.Group;
  private projectileGroup: Phaser.GameObjects.Group;
  private enemyMap: Map<string, Enemy>;

  public currentWave: number = 0;
  public totalWaves: number = 4;
  public remainingEnemies: number = 0;
  private isTransitioning: boolean = false;

  private waveConfigs: WaveConfig[] = [
    {
      waveNumber: 1,
      title: 'ONDA 1/4: OS PRIMEIROS HABITANTES',
      slimes: [
        { x: 570, y: 320 },
        { x: 440, y: 488 },
        { x: 700, y: 488 },
        { x: 570, y: 680 },
        { x: 380, y: 380 }
      ],
      mages: []
    },
    {
      waveNumber: 2,
      title: 'ONDA 2/4: A CONJURAÇÃO DAS RUÍNAS',
      slimes: [
        { x: 320, y: 300 },
        { x: 820, y: 300 },
        { x: 320, y: 680 },
        { x: 820, y: 680 },
        { x: 570, y: 300 },
        { x: 570, y: 700 }
      ],
      mages: [
        { x: 760, y: 240 },
        { x: 380, y: 740 }
      ]
    },
    {
      waveNumber: 3,
      title: 'ONDA 3/4: FRENESI DOS MONSTROS',
      slimes: [
        { x: 260, y: 280 },
        { x: 880, y: 280 },
        { x: 260, y: 800 },
        { x: 880, y: 800 },
        { x: 570, y: 240 },
        { x: 570, y: 750 },
        { x: 400, y: 488 }
      ],
      mages: [
        { x: 820, y: 220 },
        { x: 280, y: 760 },
        { x: 860, y: 700 }
      ]
    },
    {
      waveNumber: 4,
      title: 'ONDA 4/4 (CHEFE): O DESPERTAR DO REI SLIME',
      slimes: [
        { x: 480, y: 420 },
        { x: 660, y: 420 },
        { x: 480, y: 560 },
        { x: 660, y: 560 }
      ],
      mages: [
        { x: 780, y: 240 }
      ],
      hasBoss: true,
      bossPos: { x: 570, y: 280 }
    }
  ];

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
    this.nextWave();
  }

  public nextWave() {
    if (this.currentWave >= this.totalWaves) return;

    this.currentWave++;
    this.isTransitioning = false;
    const config = this.waveConfigs[this.currentWave - 1];

    // Limpa mapa de inimigos da onda anterior
    this.enemyMap.clear();

    // Banner de Início da Onda
    this.showWaveBanner(config.title);

    let spawnedCount = 0;

    // 1. Spawna Slimes da Onda
    config.slimes.forEach((pos, idx) => {
      const id = `w${this.currentWave}_slime_${idx}`;
      this.spawnSpawnCloud(pos.x, pos.y);

      const slime = new SlimeEnemy(this.scene, pos.x, pos.y, this.dropGroup);
      slime.setData('networkId', id);
      this.enemyGroup.add(slime);
      this.enemyMap.set(id, slime);
      spawnedCount++;
    });

    // 2. Spawna Magos da Onda
    config.mages.forEach((pos, idx) => {
      const id = `w${this.currentWave}_mage_${idx}`;
      this.spawnSpawnCloud(pos.x, pos.y);

      const mage = new SkeletonMage(this.scene, pos.x, pos.y, this.dropGroup, this.projectileGroup);
      mage.setData('networkId', id);
      this.enemyGroup.add(mage);
      this.enemyMap.set(id, mage);
      spawnedCount++;
    });

    // 3. Spawna Chefe na Onda Final
    if (config.hasBoss && config.bossPos) {
      const bossId = 'boss_king_slime';
      this.spawnSpawnCloud(config.bossPos.x, config.bossPos.y);

      const boss = new KingSlimeBoss(this.scene, config.bossPos.x, config.bossPos.y, this.dropGroup, this.enemyGroup);
      boss.setData('networkId', bossId);
      this.enemyGroup.add(boss);
      this.enemyMap.set(bossId, boss);
      spawnedCount++;
    }

    this.remainingEnemies = spawnedCount;
    this.emitWaveUpdate();

    // Sincroniza início de onda via P2P se for o Host
    if (NetworkManager.isHost && NetworkManager.isConnected()) {
      NetworkManager.sendAction({
        type: 'scene_sync',
        payload: { wave: this.currentWave }
      });
    }
  }

  public onEnemyKilled(deadEnemy: Enemy) {
    if (this.isTransitioning) return;

    // Inimigos invocados pelo chefe (minions) não decrementam o contador da onda
    if (deadEnemy.getData('isMinion')) return;

    this.remainingEnemies = Math.max(0, this.remainingEnemies - 1);
    this.emitWaveUpdate();

    // Se todos os inimigos da onda atual foram eliminados
    if (this.remainingEnemies <= 0) {
      this.isTransitioning = true;

      if (this.currentWave >= this.totalWaves) {
        // Vitória completa da Masmorra
        this.showWaveBanner('👑 TODAS AS 4 ONDAS VENCIDAS! O REI SLIME CAIU!', true);
        EventBus.emit(CONSTANTS.EVENTS.WAVE_COMPLETED, this.currentWave);

        if (NetworkManager.isConnected()) {
          NetworkManager.sendAction({ type: 'dungeon_victory' });
        }

        // Dá 4 segundos para o jogador ver a comemoração, abrir o Baú do Chefe e recolher suas recompensas
        this.scene.time.delayedCall(4000, () => {
          this.scene.scene.stop('UIScene');
          this.scene.scene.start('GameOverScene', { victory: true });
        });
      } else {
        // Próxima Onda com contagem regressiva e aviso claro do chefe
        const nextWave = this.currentWave + 1;
        const bannerText = nextWave === this.totalWaves
          ? `✨ ONDA ${this.currentWave}/4 CONCLUÍDA! PREPARE-SE PARA A ONDA 4 (CHEFE)!`
          : `✨ ONDA ${this.currentWave}/4 CONCLUÍDA!`;

        this.showWaveBanner(bannerText, false);
        EventBus.emit(CONSTANTS.EVENTS.WAVE_COMPLETED, this.currentWave);

        this.scene.time.delayedCall(3000, () => {
          this.nextWave();
        });
      }
    }
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
      CONSTANTS.GAME_WIDTH / 2,
      isBig ? 65 : 45,
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
