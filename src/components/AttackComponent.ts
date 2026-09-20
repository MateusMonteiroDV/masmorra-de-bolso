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
    const slashDist = 24;
    const slashX = this.owner.x + Math.cos(angleRad) * slashDist;
    const slashY = this.owner.y + Math.sin(angleRad) * slashDist;

    // Criar sprite visual do corte de espada amplo
    const slash = this.owner.scene.add.sprite(slashX, slashY, ASSET_KEYS.ITEMS.SLASH_FX);
    slash.setDepth(CONSTANTS.DEPTH.EFFECTS);
    slash.setRotation(angleRad);
    slash.setScale(1.4);

    if (burnOnAttack) {
      slash.setTint(0xf97316); // Laranja para fogo
    }

    // Animação dinâmica de corte com fade out
    this.owner.scene.tweens.add({
      targets: slash,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 160,
      onComplete: () => slash.destroy()
    });

    // Detecção de impacto em Área (AoE):
    // 1. Inimigos em contato direto / corpo-a-corpo imediato (raio de 36px em 360° ao redor do jogador)
    // 2. Inimigos no cone/semicírculo frontal amplo (alcance de até 60px com arco de ±75°)
    const targets = targetGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const halfArcRad = Phaser.Math.DegToRad(75);

    targets.forEach(target => {
      if (!target.active) return;

      const dist = Phaser.Math.Distance.Between(this.owner.x, this.owner.y, target.x, target.y);
      let isHit = false;

      if (dist <= 36) {
        // Área imediata de contato 360° (evita errar inimigos grudados no jogador)
        isHit = true;
      } else if (dist <= 60) {
        // Semicírculo frontal abrangente na direção do golpe
        const enemyAngleRad = Phaser.Math.Angle.Between(this.owner.x, this.owner.y, target.x, target.y);
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
