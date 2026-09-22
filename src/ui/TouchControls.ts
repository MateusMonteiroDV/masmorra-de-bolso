import * as Phaser from 'phaser';
import { CONSTANTS } from '../core/Constants';
import { PlayerController } from '../entities/player/PlayerController';

/**
 * Detecta se o dispositivo atual possui capacidades de toque / é mobile
 */
export function isTouchDevice(game?: Phaser.Game): boolean {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('touch') || urlParams.has('mobile')) return true;
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return true;
  }
  if (game && (game.device.os.android || game.device.os.iOS || game.device.input.touch)) {
    return true;
  }
  return false;
}

/**
 * Verifica se o modo de tela cheia está ativo no navegador
 */
export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
}

/**
 * Alterna tela cheia no mobile com bloqueio de orientação em paisagem
 */
export function toggleFullscreen(scene: Phaser.Scene) {
  if (typeof document === 'undefined') return;
  const doc = document as any;
  const docEl = document.documentElement as any;

  const isFs = isFullscreenActive();

  if (isFs) {
    const exitFs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
    if (exitFs) {
      exitFs.call(doc).catch(() => {});
    }
  } else {
    const reqFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    if (reqFs) {
      reqFs.call(docEl, { navigationUI: 'hide' }).catch(() => {
        try {
          scene.scale.startFullscreen();
        } catch (e) {}
      });
    } else {
      try {
        scene.scale.startFullscreen();
      } catch (e) {}
    }

    // Travar orientação em paisagem (landscape) para celulares
    try {
      const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
      if (orientation && orientation.lock) {
        orientation.lock('landscape').catch(() => {});
      }
    } catch (e) {}
  }

  // Recalcular layout do Phaser e compensar barra de endereço
  setTimeout(() => {
    try {
      scene.scale.refresh();
      window.scrollTo(0, 1);
    } catch (e) {}
  }, 200);
}

export interface TouchControlsOptions {
  showInteract?: boolean;
  isHub?: boolean;
}

export class TouchControls {
  private scene: Phaser.Scene;
  private controller?: PlayerController;
  private container: Phaser.GameObjects.Container;
  private options: TouchControlsOptions;

  // Joystick Virtual (Movimentação)
  private joyBase!: Phaser.GameObjects.Graphics;
  private joyKnob!: Phaser.GameObjects.Graphics;
  private joyCenterX: number = 52;
  private joyCenterY: number = 216;
  private joyRadius: number = 32;
  private joyMaxDistance: number = 26;
  private joyPointerId: number | null = null;

  // Botões de Ação
  private attackBtn?: Phaser.GameObjects.Container;
  private dashBtn?: Phaser.GameObjects.Container;
  private shootBtn?: Phaser.GameObjects.Container;
  private shieldBtn?: Phaser.GameObjects.Container;
  private interactBtn?: Phaser.GameObjects.Container;
  private fullscreenBtn?: Phaser.GameObjects.Container;

  // Mira e Disparo Segurado (Besta)
  private shootPointerId: number | null = null;
  private isAimingShoot: boolean = false;
  private isAimInCancel: boolean = false;
  private aimKnobGraphics?: Phaser.GameObjects.Graphics;
  private aimBgGraphics?: Phaser.GameObjects.Graphics;
  private aimCancelZone?: Phaser.GameObjects.Container;
  private aimIconText?: Phaser.GameObjects.Text;

  // Ouvintes de evento para limpeza adequada
  private onPointerMoveJoy?: (pointer: Phaser.Input.Pointer) => void;
  private onPointerUpJoy?: (pointer: Phaser.Input.Pointer) => void;
  private onPointerMoveAim?: (pointer: Phaser.Input.Pointer) => void;
  private onPointerUpAim?: (pointer: Phaser.Input.Pointer) => void;
  private onFsChange?: () => void;

  constructor(scene: Phaser.Scene, controller?: PlayerController, options: TouchControlsOptions = {}) {
    this.scene = scene;
    this.controller = controller;
    this.options = options;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(CONSTANTS.DEPTH.MODAL + 50);

    this.createVirtualJoystick();
    this.createActionButtons();
    this.createFullscreenButton();
  }

  public setController(controller: PlayerController) {
    this.controller = controller;
  }

  private createVirtualJoystick() {
    // 1. Base do Joystick (Círculo externo com cruz direcional sutil)
    this.joyBase = this.scene.add.graphics();
    this.drawJoyBase(false);

    // 2. Manete / Knob do Joystick (Círculo móvel sob o polegar)
    this.joyKnob = this.scene.add.graphics();
    this.drawJoyKnob(this.joyCenterX, this.joyCenterY, false);

    this.container.add([this.joyBase, this.joyKnob]);

    // 3. Zona interativa ampla no canto inferior esquerdo para captura flexível do toque
    const zoneW = CONSTANTS.GAME_WIDTH * 0.42;
    const zoneH = CONSTANTS.GAME_HEIGHT * 0.58;
    const zoneX = zoneW / 2;
    const zoneY = CONSTANTS.GAME_HEIGHT - zoneH / 2;

    const hitZone = this.scene.add.zone(zoneX, zoneY, zoneW, zoneH);
    hitZone.setOrigin(0.5);
    hitZone.setInteractive();
    this.container.add(hitZone);

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      (pointer as any).isVirtualControl = true;
      this.joyPointerId = pointer.id;

      // Se tocar perto da base, mantém; se tocar um pouco mais longe, o joystick segue suavemente
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joyCenterX, this.joyCenterY);
      if (dist < 45) {
        this.updateJoystickKnob(pointer.x, pointer.y);
      } else {
        this.joyCenterX = Phaser.Math.Clamp(pointer.x, 35, 120);
        this.joyCenterY = Phaser.Math.Clamp(pointer.y, 170, 245);
        this.drawJoyBase(true);
        this.updateJoystickKnob(pointer.x, pointer.y);
      }
    });

    this.onPointerMoveJoy = (pointer: Phaser.Input.Pointer) => {
      if (this.joyPointerId === pointer.id) {
        (pointer as any).isVirtualControl = true;
        this.updateJoystickKnob(pointer.x, pointer.y);
      }
    };

    this.onPointerUpJoy = (pointer: Phaser.Input.Pointer) => {
      if (this.joyPointerId === pointer.id) {
        this.joyPointerId = null;
        this.drawJoyKnob(this.joyCenterX, this.joyCenterY, false);
        this.drawJoyBase(false);
        if (this.controller) {
          this.controller.virtualMoveVector = { x: 0, y: 0 };
        }
      }
    };

    this.scene.input.on('pointermove', this.onPointerMoveJoy);
    this.scene.input.on('pointerup', this.onPointerUpJoy);
    this.scene.input.on('pointerupoutside', this.onPointerUpJoy);
  }

  private drawJoyBase(active: boolean) {
    this.joyBase.clear();

    // Fundo do analógico
    this.joyBase.fillStyle(0x0f172a, active ? 0.5 : 0.3);
    this.joyBase.fillCircle(this.joyCenterX, this.joyCenterY, this.joyRadius);

    // Borda iluminada
    this.joyBase.lineStyle(1.5, active ? 0x38bdf8 : 0x64748b, active ? 0.75 : 0.45);
    this.joyBase.strokeCircle(this.joyCenterX, this.joyCenterY, this.joyRadius);

    // Cruz direcional sutil
    this.joyBase.lineStyle(1, 0x94a3b8, 0.25);
    this.joyBase.lineBetween(this.joyCenterX - 14, this.joyCenterY, this.joyCenterX + 14, this.joyCenterY);
    this.joyBase.lineBetween(this.joyCenterX, this.joyCenterY - 14, this.joyCenterX, this.joyCenterY + 14);
  }

  private drawJoyKnob(x: number, y: number, active: boolean) {
    this.joyKnob.clear();
    this.joyKnob.fillStyle(active ? 0x38bdf8 : 0x0284c7, active ? 0.75 : 0.5);
    this.joyKnob.fillCircle(x, y, 14);
    this.joyKnob.lineStyle(2, 0xffffff, active ? 0.95 : 0.7);
    this.joyKnob.strokeCircle(x, y, 14);
  }

  private updateJoystickKnob(pointerX: number, pointerY: number) {
    const angle = Phaser.Math.Angle.Between(this.joyCenterX, this.joyCenterY, pointerX, pointerY);
    const dist = Phaser.Math.Distance.Between(this.joyCenterX, this.joyCenterY, pointerX, pointerY);

    const clampedDist = Math.min(dist, this.joyMaxDistance);
    const knobX = this.joyCenterX + Math.cos(angle) * clampedDist;
    const knobY = this.joyCenterY + Math.sin(angle) * clampedDist;

    this.drawJoyKnob(knobX, knobY, true);

    if (this.controller) {
      // Deadzone de 15% para evitar deriva acidental
      if (clampedDist < 4) {
        this.controller.virtualMoveVector = { x: 0, y: 0 };
      } else {
        const intensity = clampedDist / this.joyMaxDistance;
        this.controller.virtualMoveVector = {
          x: Math.cos(angle) * intensity,
          y: Math.sin(angle) * intensity
        };
      }
    }
  }

  private createActionButtons() {
    const isHub = this.options.isHub;

    // 1. Botão de Espada / Ataque Melee (Botão Principal no canto inferior direito)
    this.attackBtn = this.createButton({
      x: CONSTANTS.GAME_WIDTH - 44,
      y: CONSTANTS.GAME_HEIGHT - 44,
      radius: 23,
      bgColor: 0xef4444,
      borderColor: 0xf87171,
      icon: '⚔️',
      label: 'ATACAR',
      onDown: () => {
        if (this.controller) {
          this.controller.virtualAttackTriggered = true;
        }
      }
    });

    // 2. Botão de Esquiva / Dash (Ágil ao lado da espada)
    this.dashBtn = this.createButton({
      x: CONSTANTS.GAME_WIDTH - 96,
      y: CONSTANTS.GAME_HEIGHT - 34,
      radius: 17,
      bgColor: 0x3b82f6,
      borderColor: 0x60a5fa,
      icon: '⚡',
      label: 'DASH',
      onDown: () => {
        if (this.controller) {
          this.controller.virtualDashTriggered = true;
        }
      }
    });

    // 3. Botão de Interação [E] (Abrir baús, loja, portal)
    this.interactBtn = this.createButton({
      x: isHub ? CONSTANTS.GAME_WIDTH - 44 : CONSTANTS.GAME_WIDTH - 142,
      y: isHub ? CONSTANTS.GAME_HEIGHT - 100 : CONSTANTS.GAME_HEIGHT - 40,
      radius: isHub ? 21 : 16,
      bgColor: 0xf59e0b,
      borderColor: 0xfbbf24,
      icon: '✋',
      label: '[E] USAR',
      onDown: () => {
        if (this.controller) {
          this.controller.virtualInteractTriggered = true;
        }
      }
    });

    // Em masmorras, inclui botões de combate à distância (Besta com mira) e Escudo
    if (!isHub) {
      // 4. Botão de Mira e Disparo de Flechas (Segure para Mirar, Arraste 360°, Solte para Disparar)
      this.shootBtn = this.createAimShootButton({
        x: CONSTANTS.GAME_WIDTH - 44,
        y: CONSTANTS.GAME_HEIGHT - 98,
        radius: 20
      });

      // 5. Botão de Defesa com Escudo (Pressionar e segurar)
      this.shieldBtn = this.createButton({
        x: CONSTANTS.GAME_WIDTH - 96,
        y: CONSTANTS.GAME_HEIGHT - 82,
        radius: 17,
        bgColor: 0x8b5cf6,
        borderColor: 0xa78bfa,
        icon: '🛡️',
        label: 'ESCUDO',
        onDown: () => {
          if (this.controller) {
            this.controller.virtualDefendDown = true;
          }
        },
        onUp: () => {
          if (this.controller) {
            this.controller.virtualDefendDown = false;
          }
        }
      });
    }
  }

  /**
   * Cria o botão analógico de mira da Besta:
   * - Segurar: ativa a linha de mira tática a partir do Roberto
   * - Arrastar: direciona a flecha com precisão 360°
   * - Soltar: dispara a flecha na direção apontada
   * - Arrastar para o botão Cancelar [X]: cancela sem gastar flecha
   * - Toque rápido: dispara imediatamente para a frente
   */
  private createAimShootButton(config: {
    x: number;
    y: number;
    radius: number;
  }): Phaser.GameObjects.Container {
    const btnContainer = this.scene.add.container(config.x, config.y);
    const radius = config.radius;

    // Fundo do botão Besta
    const bg = this.scene.add.graphics();
    this.aimBgGraphics = bg;
    const drawBg = (aiming: boolean, cancel: boolean) => {
      bg.clear();
      if (cancel) {
        bg.fillStyle(0xd97706, 0.65);
        bg.fillCircle(0, 0, radius);
        bg.lineStyle(2, 0xf59e0b, 0.95);
        bg.strokeCircle(0, 0, radius);
      } else if (aiming) {
        bg.fillStyle(0x065f46, 0.75);
        bg.fillCircle(0, 0, radius + 2);
        bg.lineStyle(2, 0x34d399, 1);
        bg.strokeCircle(0, 0, radius + 2);
      } else {
        bg.fillStyle(0x10b981, 0.4);
        bg.fillCircle(0, 0, radius);
        bg.lineStyle(2, 0x34d399, 0.85);
        bg.strokeCircle(0, 0, radius);
      }
    };
    drawBg(false, false);

    // Knob / Indicador móvel de mira sob o polegar
    const knob = this.scene.add.graphics();
    this.aimKnobGraphics = knob;
    const drawKnob = (kx: number, ky: number, aiming: boolean, cancel: boolean) => {
      knob.clear();
      if (cancel) {
        knob.fillStyle(0xef4444, 0.85);
        knob.fillCircle(kx, ky, 11);
        knob.lineStyle(2, 0xffffff, 0.95);
        knob.strokeCircle(kx, ky, 11);
      } else if (aiming) {
        knob.fillStyle(0x34d399, 0.9);
        knob.fillCircle(kx, ky, 11);
        knob.lineStyle(2, 0xffffff, 1);
        knob.strokeCircle(kx, ky, 11);
      } else {
        knob.fillStyle(0x10b981, 0.7);
        knob.fillCircle(kx, ky, 10);
        knob.lineStyle(1.5, 0xffffff, 0.8);
        knob.strokeCircle(kx, ky, 10);
      }
    };
    drawKnob(0, -2, false, false);

    const iconText = this.scene.add.text(0, -2, '🏹', {
      fontSize: `${Math.round(radius * 0.8)}px`,
      color: '#ffffff'
    }).setOrigin(0.5);
    this.aimIconText = iconText;

    const labelText = this.scene.add.text(0, radius * 0.58, 'MIRA/TIRO', {
      fontFamily: 'monospace',
      fontSize: '5.5px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Área de Cancelamento visual que surge acima à esquerda do botão durante a mira
    const cancelZone = this.scene.add.container(-38, -36);
    this.aimCancelZone = cancelZone;
    cancelZone.setVisible(false);

    const cancelBg = this.scene.add.graphics();
    cancelBg.fillStyle(0xd97706, 0.8);
    cancelBg.fillCircle(0, 0, 13);
    cancelBg.lineStyle(1.5, 0xfde047, 0.95);
    cancelBg.strokeCircle(0, 0, 13);

    const cancelText = this.scene.add.text(0, 0, '✖', {
      fontSize: '11px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const cancelLabel = this.scene.add.text(0, 16, 'CANCELAR', {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#fde047',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    cancelZone.add([cancelBg, cancelText, cancelLabel]);
    btnContainer.add([bg, cancelZone, knob, iconText, labelText]);

    btnContainer.setSize(radius * 2, radius * 2);
    btnContainer.setInteractive({ useHandCursor: true });

    // Touch down no botão da Besta
    btnContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      (pointer as any).isVirtualControl = true;
      this.shootPointerId = pointer.id;
      this.isAimingShoot = true;
      this.isAimInCancel = false;

      drawBg(true, false);
      cancelZone.setVisible(true);

      if (this.controller) {
        this.controller.isVirtualAiming = true;
        // Direção inicial: baseado no facing atual do Roberto
        const player = (this.scene as any).player;
        if (player) {
          this.controller.virtualAimAngleRad = player.facing === 'e' ? Math.PI : 0;
        }
      }
    });

    // Movimento do toque para mirar em 360 graus
    this.onPointerMoveAim = (pointer: Phaser.Input.Pointer) => {
      if (this.shootPointerId === pointer.id && this.isAimingShoot) {
        (pointer as any).isVirtualControl = true;

        const dx = pointer.x - config.x;
        const dy = pointer.y - config.y;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        // Checar se o polegar foi arrastado até a zona de cancelamento (-38, -36)
        const cancelDist = Math.hypot(pointer.x - (config.x - 38), pointer.y - (config.y - 36));
        this.isAimInCancel = cancelDist < 20;

        if (this.isAimInCancel) {
          drawBg(true, true);
          drawKnob(-19, -18, true, true);
          iconText.setPosition(-19, -18);
          if (this.controller) {
            // Oculta a linha de mira enquanto estiver cancelando
            this.controller.isVirtualAiming = false;
          }
        } else {
          if (this.controller) {
            this.controller.isVirtualAiming = true;
          }
          drawBg(true, false);

          const maxKnob = 16;
          const clamped = Math.min(dist, maxKnob);
          const kx = Math.cos(angle) * clamped;
          const ky = Math.sin(angle) * clamped;
          drawKnob(kx, ky, true, false);
          iconText.setPosition(kx, ky);

          if (dist > 6 && this.controller) {
            this.controller.virtualAimAngleRad = angle;
          }
        }
      }
    };

    // Soltar o dedo
    this.onPointerUpAim = (pointer: Phaser.Input.Pointer) => {
      if (this.shootPointerId === pointer.id) {
        const wasAiming = this.isAimingShoot;
        const wasCancel = this.isAimInCancel;

        this.shootPointerId = null;
        this.isAimingShoot = false;
        this.isAimInCancel = false;

        drawBg(false, false);
        drawKnob(0, -2, false, false);
        iconText.setPosition(0, -2);
        cancelZone.setVisible(false);

        if (this.controller) {
          this.controller.isVirtualAiming = false;

          if (!wasCancel && wasAiming) {
            const dx = pointer.x - config.x;
            const dy = pointer.y - config.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 8) {
              // Disparo direcionado com precisão 360°
              const player = (this.scene as any).player;
              const pX = player?.x ?? (CONSTANTS.GAME_WIDTH / 2);
              const pY = player?.y ?? (CONSTANTS.GAME_HEIGHT / 2);
              const shootDist = 280;
              const angle = this.controller.virtualAimAngleRad;

              this.controller.virtualShootTarget = {
                x: pX + Math.cos(angle) * shootDist,
                y: pY + Math.sin(angle) * shootDist
              };
              this.controller.virtualShootTriggered = true;
            } else {
              // Toque rápido: dispara imediatamente para a frente
              this.controller.virtualShootTarget = null;
              this.controller.virtualShootTriggered = true;
            }
          }
        }
      }
    };

    this.scene.input.on('pointermove', this.onPointerMoveAim);
    this.scene.input.on('pointerup', this.onPointerUpAim);
    this.scene.input.on('pointerupoutside', this.onPointerUpAim);

    this.container.add(btnContainer);
    return btnContainer;
  }

  private createButton(config: {
    x: number;
    y: number;
    radius: number;
    bgColor: number;
    borderColor: number;
    icon: string;
    label: string;
    onDown: () => void;
    onUp?: () => void;
  }): Phaser.GameObjects.Container {
    const btnContainer = this.scene.add.container(config.x, config.y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(config.bgColor, 0.4);
    bg.fillCircle(0, 0, config.radius);
    bg.lineStyle(2, config.borderColor, 0.85);
    bg.strokeCircle(0, 0, config.radius);

    const iconText = this.scene.add.text(0, -3, config.icon, {
      fontSize: `${Math.round(config.radius * 0.85)}px`,
      color: '#ffffff'
    }).setOrigin(0.5);

    const labelText = this.scene.add.text(0, config.radius * 0.55, config.label, {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    btnContainer.add([bg, iconText, labelText]);
    btnContainer.setSize(config.radius * 2, config.radius * 2);
    btnContainer.setInteractive({ useHandCursor: true });

    btnContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      (pointer as any).isVirtualControl = true;
      btnContainer.setScale(0.88);
      bg.clear();
      bg.fillStyle(config.bgColor, 0.75);
      bg.fillCircle(0, 0, config.radius);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeCircle(0, 0, config.radius);

      config.onDown();
    });

    const releaseButton = (pointer: Phaser.Input.Pointer) => {
      (pointer as any).isVirtualControl = true;
      btnContainer.setScale(1);
      bg.clear();
      bg.fillStyle(config.bgColor, 0.4);
      bg.fillCircle(0, 0, config.radius);
      bg.lineStyle(2, config.borderColor, 0.85);
      bg.strokeCircle(0, 0, config.radius);

      if (config.onUp) {
        config.onUp();
      }
    };

    btnContainer.on('pointerup', releaseButton);
    btnContainer.on('pointerout', releaseButton);

    this.container.add(btnContainer);
    return btnContainer;
  }

  private createFullscreenButton() {
    // Botão de tela cheia elegante no topo direito com status visual ativo
    this.fullscreenBtn = this.scene.add.container(CONSTANTS.GAME_WIDTH - 22, 16);

    const bg = this.scene.add.graphics();
    const updateVisual = (isFs: boolean) => {
      bg.clear();
      bg.fillStyle(0x0f172a, 0.65);
      bg.fillRoundedRect(-14, -11, 28, 22, 5);
      bg.lineStyle(1.5, isFs ? 0x22c55e : 0x38bdf8, 0.85);
      bg.strokeRoundedRect(-14, -11, 28, 22, 5);
    };
    updateVisual(isFullscreenActive());

    const icon = this.scene.add.text(0, -3, isFullscreenActive() ? '🗗' : '⛶', {
      fontSize: '11px',
      color: isFullscreenActive() ? '#22c55e' : '#38bdf8'
    }).setOrigin(0.5);

    const label = this.scene.add.text(0, 6, isFullscreenActive() ? 'SAIR' : 'TELA', {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    this.fullscreenBtn.add([bg, icon, label]);
    this.fullscreenBtn.setSize(28, 22);
    this.fullscreenBtn.setInteractive({ useHandCursor: true });

    this.fullscreenBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      (pointer as any).isVirtualControl = true;
      toggleFullscreen(this.scene);
    });

    this.onFsChange = () => {
      const active = isFullscreenActive();
      icon.setText(active ? '🗗' : '⛶');
      icon.setColor(active ? '#22c55e' : '#38bdf8');
      label.setText(active ? 'SAIR' : 'TELA');
      updateVisual(active);
    };

    document.addEventListener('fullscreenchange', this.onFsChange);
    document.addEventListener('webkitfullscreenchange', this.onFsChange);

    this.container.add(this.fullscreenBtn);
  }

  public setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  public destroy() {
    if (this.onPointerMoveJoy) this.scene.input.off('pointermove', this.onPointerMoveJoy);
    if (this.onPointerUpJoy) {
      this.scene.input.off('pointerup', this.onPointerUpJoy);
      this.scene.input.off('pointerupoutside', this.onPointerUpJoy);
    }
    if (this.onPointerMoveAim) this.scene.input.off('pointermove', this.onPointerMoveAim);
    if (this.onPointerUpAim) {
      this.scene.input.off('pointerup', this.onPointerUpAim);
      this.scene.input.off('pointerupoutside', this.onPointerUpAim);
    }
    if (this.onFsChange) {
      document.removeEventListener('fullscreenchange', this.onFsChange);
      document.removeEventListener('webkitfullscreenchange', this.onFsChange);
    }
    this.container.destroy();
  }
}
