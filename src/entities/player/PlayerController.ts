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

  public mouseShootTriggered: boolean = false;
  public mouseDefendDown: boolean = false;

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

      // Bloqueia a propagação para o navegador/IBus (evita popup de texto/números no canto superior esquerdo)
      keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.Q,
        Phaser.Input.Keyboard.KeyCodes.E,
        Phaser.Input.Keyboard.KeyCodes.F,
        Phaser.Input.Keyboard.KeyCodes.J,
        Phaser.Input.Keyboard.KeyCodes.K,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.SHIFT,
      ]);
    }

    this.scene.input.mouse?.disableContextMenu();

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0 || pointer.leftButtonDown()) {
        this.mouseShootTriggered = true;
      }
      if (pointer.button === 2 || pointer.rightButtonDown()) {
        this.mouseDefendDown = true;
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2 || !pointer.rightButtonDown()) {
        this.mouseDefendDown = false;
      }
    });
  }

  public getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // A ou Seta Esquerda -> Direção negativa (-1)
    if (this.keyA?.isDown || this.cursors?.left.isDown) {
      x -= 1;
    }
    // D ou Seta Direita -> Direção positiva (+1)
    if (this.keyD?.isDown || this.cursors?.right.isDown) {
      x += 1;
    }

    // W ou Seta Cima -> (-1)
    if (this.keyW?.isDown || this.cursors?.up.isDown) {
      y -= 1;
    }
    // S ou Seta Baixo -> (+1)
    if (this.keyS?.isDown || this.cursors?.down.isDown) {
      y += 1;
    }

    return { x, y };
  }

  // Golpe com Espada (Espaço ou K)
  public isMeleeAttackPressed(): boolean {
    const spaceDown = this.keySpace ? Phaser.Input.Keyboard.JustDown(this.keySpace) : false;
    const kDown = this.keyK ? Phaser.Input.Keyboard.JustDown(this.keyK) : false;
    return spaceDown || kDown;
  }

  // Tiro com Besta / Flecha (Clique do Mouse, F ou J)
  public isShootCrossbowPressed(): boolean {
    const fDown = this.keyF ? Phaser.Input.Keyboard.JustDown(this.keyF) : false;
    const jDown = this.keyJ ? Phaser.Input.Keyboard.JustDown(this.keyJ) : false;
    const mouseShoot = this.mouseShootTriggered;
    this.mouseShootTriggered = false;
    return fDown || jDown || mouseShoot;
  }

  // Defesa com Escudo (Shift, Q ou Botão Direito do Mouse)
  public isDefending(): boolean {
    const shiftDown = this.keyShift?.isDown ?? false;
    const qDown = this.keyQ?.isDown ?? false;
    return shiftDown || qDown || this.mouseDefendDown;
  }

  public isInteractPressed(): boolean {
    return this.keyE ? Phaser.Input.Keyboard.JustDown(this.keyE) : false;
  }

  public getAimAngle(playerX: number, playerY: number, facingDirX: number, facingDirY: number): number {
    const pointer = this.scene.input.activePointer;

    if (pointer && (pointer.worldX !== 0 || pointer.worldY !== 0)) {
      const rad = Phaser.Math.Angle.Between(playerX, playerY, pointer.worldX, pointer.worldY);
      return Phaser.Math.RadToDeg(rad);
    }

    if (facingDirX !== 0 || facingDirY !== 0) {
      return Phaser.Math.RadToDeg(Math.atan2(facingDirY, facingDirX));
    }

    return 0;
  }
}
