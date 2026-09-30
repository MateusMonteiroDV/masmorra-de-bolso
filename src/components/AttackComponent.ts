import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { ASSET_KEYS } from '../assets/AssetManifest';
import { AudioService } from '../systems/AudioService';

export class AttackComponent {
  private owner: Phaser.Physics.Arcade.Sprite;
  public baseDamage: number;
  public attackCooldown: number;
  public canAttack: boolean = true;
  private cooldownTimer: number = 0;
  private attackRange: number = CONSTANTS.PLAYER.ATTACK_RANGE;

  constructor(
    owner: Phaser.Physics.Arcade.Sprite,
    baseDamage: number = CONSTANTS.PLAYER.BASE_ATTACK_DAMAGE,
    cooldown: number = CONSTANTS.PLAYER.ATTACK_COOLDOWN
  ) {
    this.owner = owner;
    this.baseDamage = baseDamage;
    this.attackCooldown = cooldown;
  }

  public attack(
    targetGroup: Phaser.GameObjects.Group,
    angleDeg: number,
    burnOnAttack: boolean = false,
    onHitSuccess?: (enemy: Phaser.Physics.Arcade.Sprite, finalDamage: number) => void
  ): boolean {
    if (!this.canAttack) {
      return false;
    }

    this.canAttack = false;
    this.cooldownTimer = this.attackCooldown;

    AudioService.playAttackSwing();

    // Calcular posição do arco do golpe na frente do personagem
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const slashDist = 26;
    const slashX = this.owner.x + Math.cos(angleRad) * slashDist;
    const slashY = this.owner.y + 4 + Math.sin(angleRad) * slashDist;

    // Criar sprite visual do corte de espada amplo
    const slash = this.owner.scene.add.sprite(slashX, slashY, ASSET_KEYS.ITEMS.SLASH_FX);
    slash.setDepth(CONSTANTS.DEPTH.EFFECTS);
    slash.setRotation(angleRad);
    slash.setScale(1.6);

    if (burnOnAttack) {
      slash.setTint(0xf97316); // Laranja para fogo
    }

    // Animação dinâmica de corte com fade out
    this.owner.scene.tweens.add({
      targets: slash,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 180,
      onComplete: () => slash.destroy()
    });

    // Detecção de impacto em Área (AoE) precisa:
    // 1. Inimigos em contato imediato 360° ao redor do jogador (raio de 48px)
    // 2. Inimigos no semicírculo frontal amplo na direção do corte (alcance até 75px com arco de ±95°)
    const targets = targetGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const halfArcRad = Phaser.Math.DegToRad(95);

    const ownerCenterX = this.owner.body ? this.owner.body.center.x : this.owner.x;
    const ownerCenterY = this.owner.body ? this.owner.body.center.y : this.owner.y;

    targets.forEach(target => {
      if (!target.active) return;

      const targetCenterX = target.body ? target.body.center.x : target.x;
      const targetCenterY = target.body ? target.body.center.y : target.y;

      const dist = Phaser.Math.Distance.Between(ownerCenterX, ownerCenterY, targetCenterX, targetCenterY);
      let isHit = false;

      if (dist <= 48) {
        // Área imediata de contato 360° (acerta inimigos colados no Roberto)
        isHit = true;
      } else if (dist <= 75) {
        // Semicírculo frontal abrangente na direção do corte
        const enemyAngleRad = Phaser.Math.Angle.Between(ownerCenterX, ownerCenterY, targetCenterX, targetCenterY);
        const diffAngle = Phaser.Math.Angle.Wrap(enemyAngleRad - angleRad);
        if (Math.abs(diffAngle) <= halfArcRad) {
          isHit = true;
        }
      }

      if (isHit) {
        let finalDamage = this.baseDamage;
        if (burnOnAttack) {
          finalDamage += 6; // Dano de queimadura
        }

        if (onHitSuccess) {
          onHitSuccess(target, finalDamage);
        }
      }
    });

    return true;
  }

  public update(delta: number) {
    if (!this.canAttack) {
      this.cooldownTimer -= delta;
      if (this.cooldownTimer <= 0) {
        this.canAttack = true;
      }
    }
  }
}
