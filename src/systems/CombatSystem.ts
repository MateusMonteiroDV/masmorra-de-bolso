import * as Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { MagicProjectile } from '../entities/projectiles/MagicProjectile';
import { ArrowProjectile } from '../entities/projectiles/ArrowProjectile';
import { CoinDrop } from '../entities/items/CoinDrop';
import { CONSTANTS } from '../core/Constants';
import { AudioService } from './AudioService';

export class CombatSystem {
  private scene: Phaser.Scene;

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

    // 2. Flecha do Roberto acertando Inimigos (Knockback + Dano 2)
    this.scene.physics.add.overlap(arrowGroup, enemyGroup, (arrowObj, enemyObj) => {
      const arrow = arrowObj as ArrowProjectile;
      const enemy = enemyObj as Enemy;
      arrow.onHitEnemy(enemy);
    });

    // 3. Contato Físico entre Inimigos e Jogador
    this.scene.physics.add.overlap(player, enemyGroup, (pObj, eObj) => {
      const p = pObj as Player;
      const e = eObj as Enemy;

      if (!p.health.isInvulnerable && !p.health.isDead() && !e.health.isDead()) {
        // Bloqueio perfeito com Escudo
        if (p.isDefending) {
          p.health.isInvulnerable = true;
          this.scene.time.delayedCall(280, () => {
            if (p.active) p.health.isInvulnerable = false;
          });

          AudioService.playAttackSwing();

          // Efeito de faísca azul de bloqueio
          const spark = this.scene.add.graphics();
          spark.fillStyle(0x38bdf8, 1);
          spark.lineStyle(1.5, 0xffffff, 1);
          const bx = (p.x + e.x) / 2;
          const by = (p.y + e.y) / 2;
          spark.strokeCircle(bx, by, 10);
          spark.fillCircle(bx, by, 8);
          spark.setDepth(CONSTANTS.DEPTH.EFFECTS);
          this.scene.tweens.add({
            targets: spark,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 180,
            onComplete: () => spark.destroy()
          });

          // Texto flutuante: BLOQUEADO!
          const blockText = this.scene.add.text(p.x, p.y - 20, 'BLOQUEADO!', {
            fontFamily: 'monospace',
            fontSize: '7px',
            color: '#38bdf8',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
          this.scene.tweens.add({
            targets: blockText,
            y: p.y - 34,
            alpha: 0,
            duration: 450,
            onComplete: () => blockText.destroy()
          });

          // Empurra o monstro para trás (Repulsão do escudo)
          if (e.movement) {
            e.movement.applyKnockback(p.x, p.y, 160, 130);
          }
          return;
        }

        // Dano normal sofrido quando não está defendendo
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
          // Escudo deflete projétil mágico
          p.health.isInvulnerable = true;
          this.scene.time.delayedCall(220, () => {
            if (p.active) p.health.isInvulnerable = false;
          });

          AudioService.playAttackSwing();

          const blockText = this.scene.add.text(p.x, p.y - 20, 'BLOQUEADO!', {
            fontFamily: 'monospace',
            fontSize: '7px',
            color: '#38bdf8',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH.UI);
          this.scene.tweens.add({
            targets: blockText,
            y: p.y - 34,
            alpha: 0,
            duration: 450,
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
