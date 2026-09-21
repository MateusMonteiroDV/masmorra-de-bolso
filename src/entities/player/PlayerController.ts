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
  public wasMouseShoot: boolean = false;
  public lastMouseShootScreenPos: { x: number; y: number } | null = null;
  private keyShootTriggered: boolean = false;

  private capturedKeys: Set<string> = new Set();
  private onKeyDownCapture?: (e: KeyboardEvent) => void;
  private onKeyUpCapture?: (e: KeyboardEvent) => void;
  private onBlur?: () => void;

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

      // Ouvintes de evento direto para garantir detecção instantânea das teclas F e J
      keyboard.on('keydown-F', () => {
        this.keyShootTriggered = true;
      });
      keyboard.on('keydown-J', () => {
        this.keyShootTriggered = true;
      });
    }

    // Ouvinte em fase de captura global (capture: true) para garantir leitura de WASD
    // mesmo se extensões do navegador (ex: Video Speed Controller) interceptarem o keydown
    if (typeof window !== 'undefined') {
      this.onKeyDownCapture = (e: KeyboardEvent) => {
        const code = e.code;
        if (
          code === 'KeyD' || code === 'KeyA' || code === 'KeyW' || code === 'KeyS' ||
          code === 'ArrowRight' || code === 'ArrowLeft' || code === 'ArrowUp' || code === 'ArrowDown' ||
          e.key === 'd' || e.key === 'D' || e.key === 'a' || e.key === 'A' ||
          e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S'
        ) {
          if (code === 'KeyD' || e.key === 'd' || e.key === 'D') this.capturedKeys.add('KeyD');
          if (code === 'KeyA' || e.key === 'a' || e.key === 'A') this.capturedKeys.add('KeyA');
          if (code === 'KeyW' || e.key === 'w' || e.key === 'W') this.capturedKeys.add('KeyW');
          if (code === 'KeyS' || e.key === 's' || e.key === 'S') this.capturedKeys.add('KeyS');
          if (code === 'ArrowRight') this.capturedKeys.add('ArrowRight');
          if (code === 'ArrowLeft') this.capturedKeys.add('ArrowLeft');
          if (code === 'ArrowUp') this.capturedKeys.add('ArrowUp');
          if (code === 'ArrowDown') this.capturedKeys.add('ArrowDown');
        }
      };

      this.onKeyUpCapture = (e: KeyboardEvent) => {
        const code = e.code;
        if (code === 'KeyD' || e.key === 'd' || e.key === 'D') this.capturedKeys.delete('KeyD');
        if (code === 'KeyA' || e.key === 'a' || e.key === 'A') this.capturedKeys.delete('KeyA');
        if (code === 'KeyW' || e.key === 'w' || e.key === 'W') this.capturedKeys.delete('KeyW');
        if (code === 'KeyS' || e.key === 's' || e.key === 'S') this.capturedKeys.delete('KeyS');
        if (code === 'ArrowRight') this.capturedKeys.delete('ArrowRight');
        if (code === 'ArrowLeft') this.capturedKeys.delete('ArrowLeft');
        if (code === 'ArrowUp') this.capturedKeys.delete('ArrowUp');
        if (code === 'ArrowDown') this.capturedKeys.delete('ArrowDown');
      };

      this.onBlur = () => {
        this.capturedKeys.clear();
      };

      window.addEventListener('keydown', this.onKeyDownCapture, true);
      window.addEventListener('keyup', this.onKeyUpCapture, true);
      window.addEventListener('blur', this.onBlur);
    }

    this.scene.input.mouse?.disableContextMenu();

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0 || pointer.leftButtonDown()) {
        this.mouseShootTriggered = true;
        this.lastMouseShootScreenPos = { x: pointer.x, y: pointer.y };
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
    const leftDown = this.keyA?.isDown || this.cursors?.left.isDown || this.capturedKeys.has('KeyA') || this.capturedKeys.has('ArrowLeft');
    if (leftDown) {
      x -= 1;
    }
    // D ou Seta Direita -> Direção positiva (+1)
    const rightDown = this.keyD?.isDown || this.cursors?.right.isDown || this.capturedKeys.has('KeyD') || this.capturedKeys.has('ArrowRight');
    if (rightDown) {
      x += 1;
    }

    // W ou Seta Cima -> (-1)
    const upDown = this.keyW?.isDown || this.cursors?.up.isDown || this.capturedKeys.has('KeyW') || this.capturedKeys.has('ArrowUp');
    if (upDown) {
      y -= 1;
    }
    // S ou Seta Baixo -> (+1)
    const downDown = this.keyS?.isDown || this.cursors?.down.isDown || this.capturedKeys.has('KeyS') || this.capturedKeys.has('ArrowDown');
    if (downDown) {
      y += 1;
    }

    return { x, y };
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      if (this.onKeyDownCapture) {
        window.removeEventListener('keydown', this.onKeyDownCapture, true);
      }
      if (this.onKeyUpCapture) {
        window.removeEventListener('keyup', this.onKeyUpCapture, true);
      }
      if (this.onBlur) {
        window.removeEventListener('blur', this.onBlur);
      }
    }
    this.capturedKeys.clear();
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
    const keyTriggered = this.keyShootTriggered;
    this.keyShootTriggered = false;

    const mouseShoot = this.mouseShootTriggered;
    this.mouseShootTriggered = false;

    if (mouseShoot) {
      this.wasMouseShoot = true;
      return true;
    }

    if (fDown || jDown || keyTriggered) {
      this.wasMouseShoot = false;
      return true;
    }

    return false;
  }

  // Esquiva / Dash (Shift ou C)
  public isDashPressed(): boolean {
    const shiftDown = this.keyShift ? Phaser.Input.Keyboard.JustDown(this.keyShift) : false;
    const cDown = this.keyC ? Phaser.Input.Keyboard.JustDown(this.keyC) : false;
    return shiftDown || cDown;
  }

  // Defesa com Escudo (Q ou Botão Direito do Mouse)
  public isDefending(): boolean {
    const qDown = this.keyQ?.isDown ?? false;
    return qDown || this.mouseDefendDown;
  }

  public isInteractPressed(): boolean {
    return this.keyE ? Phaser.Input.Keyboard.JustDown(this.keyE) : false;
  }

  public getAimAngle(playerX: number, playerY: number, facingDirX: number, facingDirY: number): number {
    const pointer = this.scene.input.activePointer;

    if (pointer && this.scene.cameras?.main) {
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const rad = Phaser.Math.Angle.Between(playerX, playerY, worldPoint.x, worldPoint.y);
      return Phaser.Math.RadToDeg(rad);
    }

    if (facingDirX !== 0 || facingDirY !== 0) {
      return Phaser.Math.RadToDeg(Math.atan2(facingDirY, facingDirX));
    }

    return 0;
  }
}
