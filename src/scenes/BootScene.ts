import * as Phaser from 'phaser';
import { generateProceduralPlaceholders } from '../assets/PlaceholderGen';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public create() {
    // 1. Gera texturas procedurais padrão no TextureManager
    // Garante que o jogo funcione 100% mesmo antes do artista colocar os arquivos finais
    generateProceduralPlaceholders(this);

    // 2. Transiciona para a cena de Pré-carregamento de assets do disco
    this.scene.start('PreloadScene');
  }
}
