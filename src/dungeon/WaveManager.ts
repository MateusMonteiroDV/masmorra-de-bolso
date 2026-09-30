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

export interface WaveConfig {
  waveNumber: number;
  title: string;
  slimes: { x: number; y: number }[];
  bats?: { x: number; y: number }[];
  mages: { x: number; y: number }[];
  minotaurs?: { x: number; y: number }[];
  hasBoss?: boolean;
  bossPos?: { x: number; y: number };
  hpMult?: number;
  speedMult?: number;
  damageMult?: number;
  goldMult?: number;
}

export class WaveManager {
  private scene: Phaser.Scene;
  private enemyGroup: Phaser.GameObjects.Group;
  private dropGroup: Phaser.GameObjects.Group;
  private projectileGroup: Phaser.GameObjects.Group;
  private enemyMap: Map<string, Enemy>;

  public currentWave: number = 0;
  public totalWaves: number = 8;
  public remainingEnemies: number = 0;
  private isTransitioning: boolean = false;

  private waveConfigs: WaveConfig[] = [
    {
      waveNumber: 1,
      title: 'ONDA 1/8: O DESPERTAR DOS SLIMES',
      slimes: [
        { x: 570, y: 320 },
        { x: 440, y: 488 },
        { x: 700, y: 488 },
        { x: 570, y: 680 },
        { x: 380, y: 380 }
      ],
      mages: [],
      hpMult: 1.0,
      speedMult: 1.0,
      damageMult: 1.0,
      goldMult: 1.0
    },
    {
      waveNumber: 2,
      title: 'ONDA 2/8: A REVOADA DAS SOMBRAS',
      slimes: [
        { x: 400, y: 340 },
        { x: 740, y: 340 },
        { x: 400, y: 640 },
        { x: 740, y: 640 },
        { x: 570, y: 720 }
      ],
      bats: [
        { x: 320, y: 260 },
        { x: 820, y: 260 },
        { x: 570, y: 250 }
      ],
      mages: [],
      hpMult: 1.15,
      speedMult: 1.1,
      damageMult: 1.2,
      goldMult: 1.2
    },
    {
      waveNumber: 3,
      title: 'ONDA 3/8: A CONJURAÇÃO DAS RUÍNAS',
      slimes: [
        { x: 320, y: 300 },
        { x: 820, y: 300 },
        { x: 320, y: 680 },
        { x: 820, y: 680 },
        { x: 570, y: 300 },
        { x: 570, y: 700 }
      ],
      bats: [
        { x: 260, y: 488 },
        { x: 880, y: 488 },
        { x: 570, y: 220 }
      ],
      mages: [
        { x: 760, y: 240 },
        { x: 380, y: 740 }
      ],
      hpMult: 1.3,
      speedMult: 1.18,
      damageMult: 1.35,
      goldMult: 1.3
    },
    {
      waveNumber: 4,
      title: 'ONDA 4/8: O CERCO DAS CATACUMBAS',
      slimes: [
        { x: 280, y: 320 },
        { x: 860, y: 320 },
        { x: 280, y: 680 },
        { x: 860, y: 680 },
        { x: 440, y: 400 },
        { x: 700, y: 400 },
        { x: 570, y: 760 }
      ],
      bats: [
        { x: 350, y: 250 },
        { x: 790, y: 250 },
        { x: 350, y: 750 },
        { x: 790, y: 750 }
      ],
      mages: [
        { x: 840, y: 230 },
        { x: 300, y: 750 },
        { x: 570, y: 220 }
      ],
      hpMult: 1.5,
      speedMult: 1.25,
      damageMult: 1.5,
      goldMult: 1.5
    },
    {
      waveNumber: 5,
      title: 'ONDA 5/8: FRENESI DOS MONSTROS',
      slimes: [
        { x: 260, y: 280 },
        { x: 880, y: 280 },
        { x: 260, y: 800 },
        { x: 880, y: 800 },
        { x: 400, y: 488 },
        { x: 740, y: 488 },
        { x: 570, y: 280 },
        { x: 570, y: 720 }
      ],
      bats: [
        { x: 300, y: 350 },
        { x: 840, y: 350 },
        { x: 300, y: 650 },
        { x: 840, y: 650 },
        { x: 570, y: 190 }
      ],
      mages: [
        { x: 820, y: 220 },
        { x: 280, y: 760 },
        { x: 860, y: 700 },
        { x: 570, y: 810 }
      ],
      hpMult: 1.7,
      speedMult: 1.35,
      damageMult: 1.7,
      goldMult: 1.7
    },
    {
      waveNumber: 6,
      title: 'ONDA 6/8: A INVESTIDA DO MINOTAURO',
      minotaurs: [
        { x: 570, y: 320 }
      ],
      slimes: [
        { x: 240, y: 260 },
        { x: 900, y: 260 },
        { x: 240, y: 820 },
        { x: 900, y: 820 },
        { x: 360, y: 500 },
        { x: 780, y: 500 }
      ],
      bats: [
        { x: 250, y: 380 },
        { x: 890, y: 380 },
        { x: 570, y: 770 }
      ],
      mages: [
        { x: 840, y: 200 },
        { x: 300, y: 800 },
        { x: 880, y: 740 }
      ],
      hpMult: 1.9,
      speedMult: 1.45,
      damageMult: 1.9,
      goldMult: 2.0
    },
    {
      waveNumber: 7,
      title: 'ONDA 7/8: A FÚRIA DOS MINOTAUROS',
      minotaurs: [
        { x: 360, y: 400 },
        { x: 780, y: 400 }
      ],
      slimes: [
        { x: 220, y: 240 },
        { x: 920, y: 240 },
        { x: 220, y: 840 },
        { x: 920, y: 840 },
        { x: 570, y: 260 },
        { x: 570, y: 720 }
      ],
      bats: [
        { x: 200, y: 488 },
        { x: 940, y: 488 },
        { x: 380, y: 200 },
        { x: 760, y: 200 }
      ],
      mages: [
        { x: 880, y: 220 },
        { x: 260, y: 780 },
        { x: 570, y: 160 },
        { x: 570, y: 840 }
      ],
      hpMult: 2.1,
      speedMult: 1.55,
      damageMult: 2.2,
      goldMult: 2.2
    },
    {
      waveNumber: 8,
      title: 'ONDA 8/8 (CHEFE FINAL): O DESPERTAR DO REI SLIME',
      hasBoss: true,
      bossPos: { x: 570, y: 280 },
      minotaurs: [
        { x: 570, y: 720 }
      ],
      slimes: [
        { x: 420, y: 380 },
        { x: 720, y: 380 },
        { x: 420, y: 620 },
        { x: 720, y: 620 }
      ],
      bats: [
        { x: 360, y: 260 },
        { x: 780, y: 260 },
        { x: 360, y: 740 },
        { x: 780, y: 740 }
      ],
      mages: [
        { x: 860, y: 220 },
        { x: 280, y: 780 }
      ],
      hpMult: 2.5,
      speedMult: 1.45,
      damageMult: 2.5,
      goldMult: 3.0
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
    const hpMult = config.hpMult ?? 1;
    const speedMult = config.speedMult ?? 1;
    const damageMult = config.damageMult ?? 1;
    const goldMult = config.goldMult ?? 1;

    // 1. Spawna Slimes da Onda com escala de dificuldade
    config.slimes.forEach((pos, idx) => {
      const id = `w${this.currentWave}_slime_${idx}`;
      this.spawnSpawnCloud(pos.x, pos.y);

      const slime = new SlimeEnemy(this.scene, pos.x, pos.y, this.dropGroup);
      slime.setData('networkId', id);
      slime.applyDifficultyScale(hpMult, speedMult, damageMult, goldMult);
      this.enemyGroup.add(slime);
      this.enemyMap.set(id, slime);
      spawnedCount++;
    });

    // 2. Spawna Morcegos da Onda com escala de dificuldade
    if (config.bats) {
      config.bats.forEach((pos, idx) => {
        const id = `w${this.currentWave}_bat_${idx}`;
        this.spawnSpawnCloud(pos.x, pos.y);

        const bat = new BatEnemy(this.scene, pos.x, pos.y, this.dropGroup);
        bat.setData('networkId', id);
        // O morcego continua sendo derrotado em um golpe mesmo nas ondas avançadas.
        bat.applyDifficultyScale(1, speedMult, damageMult, goldMult);
        this.enemyGroup.add(bat);
        this.enemyMap.set(id, bat);
        spawnedCount++;
      });
    }

    // 3. Spawna Magos da Onda com escala de dificuldade
    config.mages.forEach((pos, idx) => {
      const id = `w${this.currentWave}_mage_${idx}`;
      this.spawnSpawnCloud(pos.x, pos.y);

      const mage = new SkeletonMage(this.scene, pos.x, pos.y, this.dropGroup, this.projectileGroup);
      mage.setData('networkId', id);
      mage.applyDifficultyScale(hpMult, speedMult, damageMult, goldMult);
      this.enemyGroup.add(mage);
      this.enemyMap.set(id, mage);
      spawnedCount++;
    });

    // 4. Spawna Minotauros da Onda com escala de dificuldade
    if (config.minotaurs) {
      config.minotaurs.forEach((pos, idx) => {
        const id = `w${this.currentWave}_minotaur_${idx}`;
        this.spawnSpawnCloud(pos.x, pos.y);

        const minotaur = new MinotaurEnemy(this.scene, pos.x, pos.y, this.dropGroup);
        minotaur.setData('networkId', id);
        minotaur.applyDifficultyScale(hpMult, speedMult, damageMult, goldMult);
        this.enemyGroup.add(minotaur);
        this.enemyMap.set(id, minotaur);
        spawnedCount++;
      });
    }

    // 5. Spawna Chefe na Onda Final
    if (config.hasBoss && config.bossPos) {
      const bossId = 'boss_king_slime';
      this.spawnSpawnCloud(config.bossPos.x, config.bossPos.y);

      const boss = new KingSlimeBoss(this.scene, config.bossPos.x, config.bossPos.y, this.dropGroup, this.enemyGroup);
      boss.setData('networkId', bossId);
      boss.applyDifficultyScale(hpMult, speedMult, damageMult, goldMult);
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
        this.showWaveBanner('👑 TODAS AS 8 ONDAS VENCIDAS! O REI SLIME FOI DERROTADO!', true);
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
          ? `✨ ONDA ${this.currentWave}/${this.totalWaves} CONCLUÍDA! PREPARE-SE PARA O CHEFE FINAL (REI SLIME)!`
          : `✨ ONDA ${this.currentWave}/${this.totalWaves} CONCLUÍDA!`;

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
