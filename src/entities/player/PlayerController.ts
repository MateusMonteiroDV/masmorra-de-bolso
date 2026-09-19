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

  // Buffer de teclas brutas direto do DOM (redundância caso o Phaser KeyCode falhe no notebook)
  private static rawKeysDown: Set<string> = new Set();
  private static rawJustDown: Set<string> = new Set();
  private static isGlobalListenerSetup: boolean = false;

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

    // Ouvinte global no nível da janela do navegador para garantir resposta em qualquer notebook
    if (!PlayerController.isGlobalListenerSetup && typeof window !== 'undefined') {
      PlayerController.isGlobalListenerSetup = true;

      window.addEventListener('keydown', (e: KeyboardEvent) => {
        PlayerController.rawKeysDown.add(e.code);
        PlayerController.rawKeysDown.add(e.key.toLowerCase());
        PlayerController.rawJustDown.add(e.code);
        PlayerController.rawJustDown.add(e.key.toLowerCase());
      });

      window.addEventListener('keyup', (e: KeyboardEvent) => {
        PlayerController.rawKeysDown.delete(e.code);
        PlayerController.rawKeysDown.delete(e.key.toLowerCase());
      });

      window.addEventListener('blur', () => {
        PlayerController.rawKeysDown.clear();
        PlayerController.rawJustDown.clear();
      });
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

  private isKeyDown(code: string, char: string, phaserKey?: Phaser.Input.Keyboard.Key): boolean {
    return Boolean(
      phaserKey?.isDown ||
      PlayerController.rawKeysDown.has(code) ||
      PlayerController.rawKeysDown.has(char)
    );
  }

  private isJustPressed(code: string, char: string, phaserKey?: Phaser.Input.Keyboard.Key): boolean {
    const phaserDown = phaserKey ? Phaser.Input.Keyboard.JustDown(phaserKey) : false;
    const rawDown = PlayerController.rawJustDown.has(code) || PlayerController.rawJustDown.has(char);
    if (rawDown) {
      PlayerController.rawJustDown.delete(code);
      PlayerController.rawJustDown.delete(char);
      return true;
    }
    return phaserDown;
  }

  public getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // A ou Seta Esquerda ou Tecla física A (ou Q em teclado AZERTY)
    const isLeft =
      this.isKeyDown('KeyA', 'a', this.keyA) ||
      this.isKeyDown('ArrowLeft', 'arrowleft', this.cursors?.left) ||
      this.isKeyDown('KeyQ', 'q');

    // D ou Seta Direita ou Tecla física D
    const isRight =
      this.isKeyDown('KeyD', 'd', this.keyD) ||
      this.isKeyDown('ArrowRight', 'arrowright', this.cursors?.right);

    // W ou Seta Cima ou Tecla física W (ou Z em teclado AZERTY)
    const isUp =
      this.isKeyDown('KeyW', 'w', this.keyW) ||
      this.isKeyDown('ArrowUp', 'arrowup', this.cursors?.up) ||
      this.isKeyDown('KeyZ', 'z');

    // S ou Seta Baixo ou Tecla física S
    const isDown =
      this.isKeyDown('KeyS', 's', this.keyS) ||
      this.isKeyDown('ArrowDown', 'arrowdown', this.cursors?.down);

    if (isLeft) x -= 1;
    if (isRight) x += 1;
    if (isUp) y -= 1;
    if (isDown) y += 1;

    return { x, y };
  }

  // Golpe com Espada (Espaço ou K)
  public isMeleeAttackPressed(): boolean {
    const space = this.isJustPressed('Space', ' ', this.keySpace);
    const k = this.isJustPressed('KeyK', 'k', this.keyK);
    return space || k;
  }

  // Tiro com Besta / Flecha (Clique do Mouse, F ou J)
  public isShootCrossbowPressed(): boolean {
    const f = this.isJustPressed('KeyF', 'f', this.keyF);
    const j = this.isJustPressed('KeyJ', 'j', this.keyJ);
    const mouseShoot = this.mouseShootTriggered;
    this.mouseShootTriggered = false;
    return f || j || mouseShoot;
  }

  // Defesa com Escudo (Shift, Q ou Botão Direito do Mouse)
  public isDefending(): boolean {
    const shift =
      this.isKeyDown('ShiftLeft', 'shift', this.keyShift) ||
      this.isKeyDown('ShiftRight', 'shift');
    const q = this.isKeyDown('KeyQ', 'q', this.keyQ);
    return shift || q || this.mouseDefendDown;
  }

  public isInteractPressed(): boolean {
    return this.isJustPressed('KeyE', 'e', this.keyE);
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
