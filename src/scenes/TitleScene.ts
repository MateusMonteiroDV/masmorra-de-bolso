import * as Phaser from 'phaser';
import { AudioService } from '../systems/AudioService';
import { NetworkManager } from '../network/NetworkManager';
import { isTouchDevice, isFullscreenActive, toggleFullscreen, createFullscreenToggleButton } from '../ui/TouchControls';

export class TitleScene extends Phaser.Scene {
  private hasStarted: boolean = false;
  private cleanupFs?: () => void;

  constructor() {
    super({ key: 'TitleScene' });
  }

  public create() {
    this.hasStarted = false;
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#770f9a');

    const particles = this.add.graphics();
    particles.setDepth(1);
    for (let i = 0; i < 25; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const pColor = Math.random() > 0.5 ? 0x22c55e : 0xfacc15;
      particles.fillStyle(pColor, Math.random() * 0.35 + 0.15);
      particles.fillCircle(px, py, Math.random() * 1.5 + 0.5);
    }

    const titleScale = 0.54;
    const imgX = width / 2;
    const imgY = height / 2 - 4;

    const titleImage = this.add.image(imgX, imgY, 'pagina_inicial');
    titleImage.setScale(titleScale);
    titleImage.setDepth(10);

    this.tweens.add({
      targets: titleImage,
      y: imgY - 3,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const playX = imgX;
    const playY = imgY + 131 * titleScale;
    const playZone = this.add.zone(playX, playY, 110, 50).setDepth(25).setInteractive({ useHandCursor: true });

    const isTouch = isTouchDevice(this.game);
    const promptKeyText = this.add.text(
      width / 2,
      height - 12,
      isTouch ? '[ Toque em PLAY para iniciar ]' : '[ Pressione ESPAÇO, ENTER ou toque em PLAY ]',
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

    this.add.text(8, 8, 'Masmorra de Bolso v1.0', {
      fontFamily: 'monospace',
      fontSize: '6.5px',
      color: '#64748b'
    }).setDepth(20);

    const { container: fsBtn, cleanup } = createFullscreenToggleButton(this, width - 22, 16, true);
    fsBtn.setDepth(30);
    this.cleanupFs = cleanup;
    this.events.once('shutdown', () => this.cleanupFs?.());

    const triggerStart = (pointerOrEvent?: any) => {
      if (this.hasStarted) return;
      if (pointerOrEvent && (pointerOrEvent as any).isVirtualControl) return;

      if (isTouchDevice(this.game) && !isFullscreenActive()) {
        toggleFullscreen(this);
      }

      this.hasStarted = true;
      AudioService.playRoomCleared();

      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.cleanupFs?.();
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

    // Toque liberado (pointerup) no PLAY ou na tela para autorização segura de tela cheia
    playZone.on('pointerup', triggerStart);
    this.input.on('pointerup', triggerStart);

    // Teclas ESPAÇO e ENTER (ou qualquer tecla do teclado)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', triggerStart);
    }
  }
}
