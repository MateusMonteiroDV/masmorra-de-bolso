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
    const slashX = this.owner.x + Math.cos(angleRad) * this.attackRange;
    const slashY = this.owner.y + Math.sin(angleRad) * this.attackRange;

    // Criar sprite visual do corte de espada
    const slash = this.owner.scene.add.sprite(slashX, slashY, ASSET_KEYS.ITEMS.SLASH_FX);
    slash.setDepth(CONSTANTS.DEPTH.EFFECTS);
    slash.setRotation(angleRad);
    slash.setScale(1.2);

    if (burnOnAttack) {
      slash.setTint(0xf97316); // Laranja para fogo
    }

    // Animação de fade/scale do golpe
    this.owner.scene.tweens.add({
      targets: slash,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => slash.destroy()
    });

    // Detecção de impacto em inimigos no raio do golpe
    const targets = targetGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    let hitAny = false;

    targets.forEach(target => {
      if (!target.active) return;

      const dist = Phaser.Math.Distance.Between(slashX, slashY, target.x, target.y);
      if (dist <= 26) {
        hitAny = true;
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
