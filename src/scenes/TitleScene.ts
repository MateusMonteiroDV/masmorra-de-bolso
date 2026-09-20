import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { AudioService } from '../systems/AudioService';
import { NetworkManager } from '../network/NetworkManager';

export class TitleScene extends Phaser.Scene {
  private hasStarted: boolean = false;

  constructor() {
    super({ key: 'TitleScene' });
  }

  public create() {
    this.hasStarted = false;
    const width = CONSTANTS.GAME_WIDTH;
    const height = CONSTANTS.GAME_HEIGHT;

    // Fundo escuro com tonalidade roxa combinando com a arte
    this.cameras.main.setBackgroundColor('#0b0714');

    // Partículas mágicas sutis no fundo (roxo e verde slime)
    const particles = this.add.graphics();
    particles.setDepth(1);
    for (let i = 0; i < 30; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const pColor = Math.random() > 0.4 ? 0x770f9a : 0x22c55e;
      particles.fillStyle(pColor, Math.random() * 0.35 + 0.15);
      particles.fillCircle(px, py, Math.random() * 1.5 + 0.5);
    }

    // Imagem da Capa / Página Inicial desenhada pelo artista (500x500)
    const titleImage = this.add.image(width / 2, height / 2 - 14, 'pagina_inicial');
    titleImage.setScale(0.53);
    titleImage.setDepth(10);

    // Efeito suave de flutuação no logotipo
    this.tweens.add({
      targets: titleImage,
      y: titleImage.y - 4,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Botão de Iniciar Jogo
    const btnW = 180;
    const btnH = 25;
    const btnY = height - 30;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x770f9a, 0.95);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 5);
    btnBg.lineStyle(1.5, 0x4ade80, 0.95);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 5);

    const btnText = this.add.text(0, 0, '⚔️ INICIAR JOGO', {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const startBtn = this.add.container(width / 2, btnY, [btnBg, btnText]);
    startBtn.setSize(btnW, btnH);
    startBtn.setDepth(20);
    startBtn.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    // Efeito de pulso no botão
    this.tweens.add({
      targets: startBtn,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Subtítulo de atalho de teclado
    const promptKeyText = this.add.text(
      width / 2,
      height - 10,
      '[ Pressione ESPAÇO, ENTER ou CLIQUE para jogar ]',
      {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#94a3b8',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: promptKeyText,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Versão e Crédito discreto no topo
    this.add.text(8, 8, 'Masmorra de Bolso v1.0', {
      fontFamily: 'monospace',
      fontSize: '6.5px',
      color: '#64748b'
    }).setDepth(20);

    const triggerStart = () => {
      if (this.hasStarted) return;
      this.hasStarted = true;

      AudioService.playRoomCleared();

      // Transição suave de fade out
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const roomParam = urlParams.get('room');
        if (roomParam && !NetworkManager.currentRoomId) {
          NetworkManager.clearRoomUrl();
          NetworkManager.join(roomParam, false);
          this.scene.start('LobbyScene');
        } else {
          this.scene.start('HubScene');
        }
      });
    };

    // Clique no botão ou em qualquer lugar da tela
    startBtn.on('pointerdown', triggerStart);
    this.input.on('pointerdown', triggerStart);

    // Teclado (qualquer tecla)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', triggerStart);
    }
  }
}
