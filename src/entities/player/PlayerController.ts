import * as Phaser from 'phaser';

export class PlayerController {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyF!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keyK!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyC!: Phaser.Input.Keyboard.Key;

  public mouseShootTriggered: boolean = false;
  public mouseDefendDown: boolean = false;
  public lastMouseShootScreenPos: { x: number; y: number } | null = null;
  public lastShootTrigger: 'mouse' | 'keyboard' | 'virtual' | null = null;
  private keyShootTriggered: boolean = false;

  // Ouvintes de entrada defensivos e universais
  private onPointerDown: (pointer: Phaser.Input.Pointer) => void;
  private onPointerUp: (pointer: Phaser.Input.Pointer) => void;
  private onWindowBlur: () => void;
  private onWindowPointerUp: (e: PointerEvent | MouseEvent) => void;

  // Estados dos Controles Touch Virtuais (Mobile)
  public virtualMoveVector: { x: number; y: number } = { x: 0, y: 0 };
  public virtualAttackTriggered: boolean = false;
  public virtualShootTriggered: boolean = false;
  public virtualDashTriggered: boolean = false;
  public virtualDefendDown: boolean = false;
  public virtualInteractTriggered: boolean = false;

  // Sistema de Mira e Disparo Segurado no Mobile (Hold & Aim)
  public isVirtualAiming: boolean = false;
  public virtualAimAngleRad: number = 0;
  public isVirtualShootAimed: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const keyboard = scene.input.keyboard;

    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyShift = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      this.keyQ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      this.keyF = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
      this.keyJ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
      this.keyK = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
      this.keyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keyC = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

      keyboard.on('keydown-F', () => {
        this.keyShootTriggered = true;
      });
      keyboard.on('keydown-J', () => {
        this.keyShootTriggered = true;
      });
    }

    this.scene.input.mouse?.disableContextMenu();

    // Suporte a Entrada Híbrida Universal (mouse + teclado + toque simultâneos)
    this.onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if ((pointer as any).isVirtualControl) return;

      if (pointer.button === 0 || pointer.leftButtonDown()) {
        this.mouseShootTriggered = true;
        this.lastMouseShootScreenPos = { x: pointer.x, y: pointer.y };
      }
      if (pointer.button === 2 || pointer.rightButtonDown()) {
        this.mouseDefendDown = true;
      }
    };

    this.onPointerUp = (pointer: Phaser.Input.Pointer) => {
      if ((pointer as any).isVirtualControl) return;

      if (pointer.button === 2 || !pointer.rightButtonDown()) {
        this.mouseDefendDown = false;
      }
    };

    // Ouvintes defensivos para destravar escudo em blur ou soltura fora da janela
    this.onWindowBlur = () => {
      this.mouseDefendDown = false;
    };

    this.onWindowPointerUp = (e: PointerEvent | MouseEvent) => {
      if (e.button === 2 || (e.buttons !== undefined && (e.buttons & 2) === 0)) {
        this.mouseDefendDown = false;
      }
    };

    this.scene.input.on('pointerdown', this.onPointerDown);
    this.scene.input.on('pointerup', this.onPointerUp);
    this.scene.input.on('pointerupoutside', this.onPointerUp);

    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this.onWindowBlur);
      window.addEventListener('pointerup', this.onWindowPointerUp);
    }
  }

  public getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.keyA?.isDown || this.cursors?.left.isDown) x -= 1;
    if (this.keyD?.isDown || this.cursors?.right.isDown) x += 1;
    if (this.keyW?.isDown || this.cursors?.up.isDown) y -= 1;
    if (this.keyS?.isDown || this.cursors?.down.isDown) y += 1;

    if (this.virtualMoveVector.x !== 0 || this.virtualMoveVector.y !== 0) {
      x += this.virtualMoveVector.x;
      y += this.virtualMoveVector.y;
    }

    return { x, y };
  }

  public destroy() {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.input.off('pointerupoutside', this.onPointerUp);

    if (typeof window !== 'undefined') {
      window.removeEventListener('blur', this.onWindowBlur);
      window.removeEventListener('pointerup', this.onWindowPointerUp);
    }
  }

  public isMeleeAttackPressed(): boolean {
    const spaceDown = this.keySpace ? Phaser.Input.Keyboard.JustDown(this.keySpace) : false;
    const kDown = this.keyK ? Phaser.Input.Keyboard.JustDown(this.keyK) : false;
    const virtualAttack = this.virtualAttackTriggered;
    this.virtualAttackTriggered = false;

    return spaceDown || kDown || virtualAttack;
  }

  public isShootCrossbowPressed(): boolean {
    const fDown = this.keyF ? Phaser.Input.Keyboard.JustDown(this.keyF) : false;
    const jDown = this.keyJ ? Phaser.Input.Keyboard.JustDown(this.keyJ) : false;
    const keyTriggered = this.keyShootTriggered;
    this.keyShootTriggered = false;

    const mouseShoot = this.mouseShootTriggered;
    this.mouseShootTriggered = false;

    const virtualShoot = this.virtualShootTriggered;
    this.virtualShootTriggered = false;

    if (mouseShoot) {
      this.lastShootTrigger = 'mouse';
      return true;
    }
    if (fDown || jDown || keyTriggered) {
      this.lastShootTrigger = 'keyboard';
      return true;
    }
    if (virtualShoot) {
      this.lastShootTrigger = 'virtual';
      return true;
    }

    return false;
  }

  public isDashPressed(): boolean {
    const shiftDown = this.keyShift ? Phaser.Input.Keyboard.JustDown(this.keyShift) : false;
    const cDown = this.keyC ? Phaser.Input.Keyboard.JustDown(this.keyC) : false;
    const virtualDash = this.virtualDashTriggered;
    this.virtualDashTriggered = false;

    return shiftDown || cDown || virtualDash;
  }

  public isDefending(): boolean {
    const qDown = this.keyQ?.isDown ?? false;
    return qDown || this.mouseDefendDown || this.virtualDefendDown;
  }

  public isInteractPressed(): boolean {
    const eDown = this.keyE ? Phaser.Input.Keyboard.JustDown(this.keyE) : false;
    const virtualInteract = this.virtualInteractTriggered;
    this.virtualInteractTriggered = false;

    return eDown || virtualInteract;
  }
}

