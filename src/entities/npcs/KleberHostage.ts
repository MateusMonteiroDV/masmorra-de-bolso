import * as Phaser from 'phaser';
import { CONSTANTS } from '../../core/Constants';

/**
 * Kleber: refém do Capetão, amarrado no topo do santuário.
 * É apenas cenário (sem corpo físico): fica parado até o chefe cair e então comemora a liberdade.
 */
export class KleberHostage extends Phaser.GameObjects.Sprite {
  public isFree: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'kleber_0');
    scene.add.existing(this);

    // Os pés ficam na linha 57 do quadro de 64px: (x, y) é o ponto em que ele pisa
    this.setOrigin(0.5, 0.9);
    this.setDepth(CONSTANTS.DEPTH.CHARACTERS - 1);
    this.play('kleber_amarrado');
  }

  /** Solta as cordas: troca a animação de amarrado pela comemoração */
  public free(): boolean {
    if (this.isFree || !this.active) return false;
    this.isFree = true;
    this.play('kleber_livre');
    return true;
  }
}
