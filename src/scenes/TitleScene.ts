import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { AudioService } from '../systems/AudioService';
import { NetworkManager } from '../network/NetworkManager';
import { isTouchDevice, isFullscreenActive, toggleFullscreen } from '../ui/TouchControls';

export class TitleScene extends Phaser.Scene {
  private hasStarted: boolean = false;
  private onFsChange?: () => void;

  constructor() {
    super({ key: 'TitleScene' });
  }

  public create() {
    this.hasStarted = false;
    const width = CONSTANTS.GAME_WIDTH;
    const height = CONSTANTS.GAME_HEIGHT;

    // Fundo roxo exatamente na mesma tonalidade da arte (#770f9a) para integração perfeita
    this.cameras.main.setBackgroundColor('#770f9a');

    // Partículas mágicas sutis no fundo (verde slime e brilho dourado)
    const particles = this.add.graphics();
    particles.setDepth(1);
    for (let i = 0; i < 25; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const pColor = Math.random() > 0.5 ? 0x22c55e : 0xfacc15;
      particles.fillStyle(pColor, Math.random() * 0.35 + 0.15);
      particles.fillCircle(px, py, Math.random() * 1.5 + 0.5);
    }

    // Imagem da Capa / Página Inicial 100% centralizada na tela
    const titleScale = 0.54;
    const imgX = width / 2;
    const imgY = height / 2 - 4;

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

    // Posição do botão oval verde "PLAY" perfeitamente alinhado no centro (x = width / 2)
    const playX = imgX;
    const playY = imgY + 131 * titleScale;
    const playW = 110;
    const playH = 50;

    // Zona interativa posicionada exatamente sobre o botão verde "PLAY" centralizado
    const playZone = this.add.zone(playX, playY, playW, playH);
    playZone.setDepth(25);
    playZone.setInteractive({ useHandCursor: true });

    // Subtítulo elegante com as opções de controle solicitadas
    const promptKeyText = this.add.text(
      width / 2,
      height - 12,
      '[ Pressione ESPAÇO, ENTER ou toque em PLAY ]',
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

    // Botão de Tela Cheia no topo direito
    const fsBtn = this.add.container(width - 24, 16);
    fsBtn.setDepth(30);

    const fsBg = this.add.graphics();
    const updateFsVisual = (isFs: boolean) => {
      fsBg.clear();
      fsBg.fillStyle(0x0f172a, 0.7);
      fsBg.fillRoundedRect(-14, -11, 28, 22, 5);
      fsBg.lineStyle(1.5, isFs ? 0x22c55e : 0x38bdf8, 0.85);
      fsBg.strokeRoundedRect(-14, -11, 28, 22, 5);
    };
    updateFsVisual(isFullscreenActive());

    const fsIcon = this.add.text(0, -3, isFullscreenActive() ? '🗗' : '⛶', {
      fontSize: '11px',
      color: isFullscreenActive() ? '#22c55e' : '#38bdf8'
    }).setOrigin(0.5);

    const fsLabel = this.add.text(0, 6, isFullscreenActive() ? 'SAIR' : 'TELA', {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    fsBtn.add([fsBg, fsIcon, fsLabel]);
    fsBtn.setSize(28, 22);
    fsBtn.setInteractive({ useHandCursor: true });

    fsBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      (pointer as any).isVirtualControl = true;
      toggleFullscreen(this);
    });

    this.onFsChange = () => {
      const active = isFullscreenActive();
      fsIcon.setText(active ? '🗗' : '⛶');
      fsIcon.setColor(active ? '#22c55e' : '#38bdf8');
      fsLabel.setText(active ? 'SAIR' : 'TELA');
      updateFsVisual(active);
    };
    document.addEventListener('fullscreenchange', this.onFsChange);
    document.addEventListener('webkitfullscreenchange', this.onFsChange);

    const triggerStart = (pointerOrEvent?: any) => {
      if (this.hasStarted) return;
      if (pointerOrEvent && (pointerOrEvent as any).isVirtualControl) return;

      // Ativa tela cheia no mobile se ainda não estiver ativa
      if (isTouchDevice(this.game) && !isFullscreenActive()) {
        toggleFullscreen(this);
      }

      this.hasStarted = true;

      AudioService.playRoomCleared();

      // Transição suave de fade out
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (this.onFsChange) {
          document.removeEventListener('fullscreenchange', this.onFsChange);
          document.removeEventListener('webkitfullscreenchange', this.onFsChange);
        }

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
