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

    // Imagem da Capa / Página Inicial com o logotipo e botão PLAY verde embutido
    const titleScale = 0.58;
    const imgX = width / 2;
    const imgY = height / 2 - 6;

    const titleImage = this.add.image(imgX, imgY, 'pagina_inicial');
    titleImage.setScale(titleScale);
    titleImage.setDepth(10);

    // Efeito suave de flutuação no conjunto da arte
    this.tweens.add({
      targets: titleImage,
      y: imgY - 3,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Posição do botão oval verde "PLAY" contido na arte (500x500)
    // No asset original: centro x=295, y=363 (offset de +45, +113 em relação ao centro 250,250)
    const playX = imgX + 45 * titleScale;
    const playY = imgY + 113 * titleScale;
    const playW = 112 * (titleScale / 0.58);
    const playH = 68 * (titleScale / 0.58);

    // Zona interativa posicionada sobre o botão verde "PLAY" da arte com cursor de mão
    const playZone = this.add.zone(playX, playY, playW, playH);
    playZone.setDepth(25);
    playZone.setInteractive({ useHandCursor: true });

    // Subtítulo elegante com as opções de controle solicitadas
    const promptKeyText = this.add.text(
      width / 2,
      height - 12,
      '[ Pressione ESPAÇO, ENTER ou clique em PLAY ]',
      {
        fontFamily: 'monospace',
        fontSize: '7.5px',
        color: '#4ade80',
        stroke: '#052e16',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: promptKeyText,
      alpha: 0.35,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Versão discreta no canto superior
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

    // Clique direto no PLAY ou em qualquer parte da tela
    playZone.on('pointerdown', triggerStart);
    this.input.on('pointerdown', triggerStart);

    // Teclas ESPAÇO e ENTER (ou qualquer tecla do teclado)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', triggerStart);
    }
  }
}
