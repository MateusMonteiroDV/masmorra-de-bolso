import * as Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { MagicProjectile } from '../entities/projectiles/MagicProjectile';
import { ArrowProjectile } from '../entities/projectiles/ArrowProjectile';
import { CoinDrop } from '../entities/items/CoinDrop';
import { CONSTANTS } from '../core/Constants';
import { GameState } from '../core/GameState';
import { AudioService } from './AudioService';

export class CombatSystem {
  private scene: Phaser.Scene;
  private lastBlockVisualTime: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setupCollisions(
    player: Player,
    enemyGroup: Phaser.GameObjects.Group,
    wallGroup: Phaser.Physics.Arcade.StaticGroup,
    projectileGroup: Phaser.GameObjects.Group,
    arrowGroup: Phaser.GameObjects.Group,
    dropGroup: Phaser.GameObjects.Group
  ) {
    // 1. Colisões com Paredes
    this.scene.physics.add.collider(player, wallGroup);
    this.scene.physics.add.collider(enemyGroup, wallGroup);

    // Projéteis colidem com paredes e somem
    this.scene.physics.add.collider(projectileGroup, wallGroup, (proj) => proj.destroy());
    this.scene.physics.add.collider(arrowGroup, wallGroup, (arrow) => arrow.destroy());

    // 2. Flecha do Roberto acertando Inimigos (Knockback + Dano)
    this.scene.physics.add.overlap(arrowGroup, enemyGroup, (arrowObj, enemyObj) => {
      const arrow = arrowObj as ArrowProjectile;
      const enemy = enemyObj as Enemy;
      arrow.onHitEnemy(enemy);
    });

    // 3. Contato Físico entre Inimigos e Jogador
    this.scene.physics.add.overlap(player, enemyGroup, (pObj, eObj) => {
      const p = pObj as Player;
      const e = eObj as Enemy;

      if (!p.health.isInvulnerable && !p.health.isDead() && !e.health.isDead() && e.contactCooldownTimer <= 0) {
        // Bloqueio perfeito com Escudo
        if (p.isDefending) {
          // Cooldown de contato no monstro para impedir spam de colisão
          e.contactCooldownTimer = 850;

          // Proteção curta e segura no jogador via HealthComponent
          p.health.setInvulnerable(200);

          // Empurra o monstro com repulsão firme para longe do Roberto (aprimorada pelo Bastião de Ferro)
          const repulsionForce = 220 * (GameState.getComputedPlayerStats().shieldRepulsionMultiplier ?? 1);
          if (e.movement) {
            e.movement.applyKnockback(p.x, p.y, repulsionForce, 180);
          }

          // Efeito visual e sonoro controlado por throttle
          const now = this.scene.time.now;
          if (now - this.lastBlockVisualTime > 180) {
            this.lastBlockVisualTime = now;
            AudioService.playShieldBlock();

            // Faísca de impacto localizada exatamente na posição do escudo
            const shieldX = p.x + (p.facing === 'd' ? 14 : -14);
            const shieldY = p.y + 4;
            const spark = this.scene.add.graphics({ x: shieldX, y: shieldY });
            spark.fillStyle(0x38bdf8, 0.9);
            spark.lineStyle(2, 0xffffff, 1);
            spark.strokeCircle(0, 0, 9);
            spark.fillCircle(0, 0, 7);
            spark.setDepth(CONSTANTS.DEPTH.EFFECTS);
            this.scene.tweens.add({
              targets: spark,
              scaleX: 1.6,
              scaleY: 1.6,
              alpha: 0,
              duration: 150,
              onComplete: () => spark.destroy()
            });

            // Texto flutuante: BLOQUEADO!
            const blockText = this.scene.add.text(p.x, p.y - 20, '🛡️ BLOQUEADO!', {
              fontFamily: 'monospace',
              fontSize: '7.5px',
              color: '#38bdf8',
              fontStyle: 'bold',
              stroke: '#000000',
              strokeThickness: 2
            }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
            this.scene.tweens.add({
              targets: blockText,
              y: p.y - 34,
              alpha: 0,
              duration: 400,
              onComplete: () => blockText.destroy()
            });
          }
          return;
        }

        // Dano normal sofrido quando não está defendendo
        e.contactCooldownTimer = 850;
        const incomingDmg = e.contactDamage;
        if (incomingDmg > 0) {
          const took = p.health.takeDamage(incomingDmg);
          if (took) {
            p.movement.applyKnockback(e.x, e.y, 160, 140);
            p.syncHealthUI();
          }
        }
      }
    });

    // 4. Projéteis Mágicos no Jogador
    this.scene.physics.add.overlap(player, projectileGroup, (pObj, projObj) => {
      const p = pObj as Player;
      const proj = projObj as MagicProjectile;

      if (!p.health.isInvulnerable && !p.health.isDead()) {
        if (p.isDefending) {
          // Escudo deflete projétil mágico com som e proteção
          p.health.setInvulnerable(200);
          AudioService.playShieldBlock();

          const blockText = this.scene.add.text(p.x, p.y - 20, '🛡️ BLOQUEADO!', {
            fontFamily: 'monospace',
            fontSize: '7.5px',
            color: '#38bdf8',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
          this.scene.tweens.add({
            targets: blockText,
            y: p.y - 34,
            alpha: 0,
            duration: 400,
            onComplete: () => blockText.destroy()
          });

          proj.destroy();
          return;
        }

        const took = p.health.takeDamage(proj.damage);
        if (took) {
          p.movement.applyKnockback(proj.x, proj.y, 120, 100);
          p.syncHealthUI();
        }
        proj.destroy();
      }
    });

    // 5. Coleta de Drops (Moedas e Flechas)
    this.scene.physics.add.overlap(player, dropGroup, (pObj, dropObj) => {
      const drop = dropObj as any;
      if (typeof drop.collect === 'function') {
        drop.collect();
      }
    });
  }
}
