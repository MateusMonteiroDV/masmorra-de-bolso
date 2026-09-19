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

    // 3. Contato Físico entre Inimigos e Jogador (Dano pré-definido)
    this.scene.physics.add.overlap(player, enemyGroup, (pObj, eObj) => {
      const p = pObj as Player;
      const e = eObj as Enemy;

      if (!p.health.isInvulnerable && !p.health.isDead() && !e.health.isDead()) {
        let incomingDmg = e.contactDamage;

        // Se o jogador estiver em postura de defesa (escudo)
        if (p.isDefending) {
          incomingDmg = Math.floor(incomingDmg * (1 - CONSTANTS.PLAYER.DEFENSE_REDUCTION));
          AudioService.playAttackSwing(); // Som de bloqueio
        }

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
        let incomingDmg = proj.damage;
        if (p.isDefending) {
          incomingDmg = Math.floor(incomingDmg * (1 - CONSTANTS.PLAYER.DEFENSE_REDUCTION));
        }

        if (incomingDmg > 0) {
          const took = p.health.takeDamage(incomingDmg);
          if (took) {
            p.movement.applyKnockback(proj.x, proj.y, 120, 100);
            p.syncHealthUI();
          }
        }
        proj.destroy();
      }
    });

    // 5. Coleta de Moedas de Ouro
    this.scene.physics.add.overlap(player, dropGroup, (pObj, dropObj) => {
      const drop = dropObj as CoinDrop;
      drop.collect();
    });
  }
}
