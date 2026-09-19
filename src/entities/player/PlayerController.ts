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
  private keyE!: Phaser.Input.Keyboard.Key;

  private mouseShootTriggered: boolean = false;
  private mouseDefendDown: boolean = false;

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
      this.keyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    this.scene.input.mouse?.disableContextMenu();

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.mouseShootTriggered = true;
      }
      if (pointer.rightButtonDown()) {
        this.mouseDefendDown = true;
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown()) {
        this.mouseDefendDown = false;
      }
    });
  }

  public getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.keyA?.isDown || this.cursors?.left.isDown) x -= 1;
    if (this.keyD?.isDown || this.cursors?.right.isDown) x += 1;
    if (this.keyW?.isDown || this.cursors?.up.isDown) y -= 1;
    if (this.keyS?.isDown || this.cursors?.down.isDown) y += 1;

    return { x, y };
  }

  // Golpe com Espada (Espaço)
  public isMeleeAttackPressed(): boolean {
    return this.keySpace ? Phaser.Input.Keyboard.JustDown(this.keySpace) : false;
  }

  // Tiro com Besta (Clique Esquerdo ou F)
  public isShootCrossbowPressed(): boolean {
    const keyFDown = this.keyF ? Phaser.Input.Keyboard.JustDown(this.keyF) : false;
    const mouseShoot = this.mouseShootTriggered;
    this.mouseShootTriggered = false;
    return keyFDown || mouseShoot;
  }

  // Postura de Defesa (Shift, Q ou Botão Direito mantido pressionado)
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
