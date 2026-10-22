import { chromium } from 'playwright';
import { createServer } from 'vite';

async function run() {
  console.log('🚀 Starting Vite test server...');
  const server = await createServer({
    server: { port: 5179, host: '127.0.0.1' },
    logLevel: 'error'
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5179;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`📡 Vite server listening at ${baseUrl}`);

  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  try {
    // Cenário: Dispositivo Híbrido (Notebook com tela Touch / Touchpad I2C, e.g. Lenovo IdeaPad)
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 1280, height: 720 },
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 5,
        configurable: true
      });
    });

    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    console.log('🌐 Navigating to game...');
    await page.goto(baseUrl);

    // Aguardar o Phaser e a cena do jogo estarem prontos
    await page.waitForFunction(() => {
      const g = window.game;
      return g && g.isBooted && g.scene && g.scene.getScene('PreloadScene');
    }, { timeout: 15000 });

    console.log('🎮 Phaser game booted.');

    // Forçar início direto da DungeonScene para teste de gameplay
    await page.evaluate(() => {
      const g = window.game;
      // Iniciar a DungeonScene e UIScene
      g.scene.start('DungeonScene');
      g.scene.start('UIScene');
    });

    // Aguardar DungeonScene estar ativa com player inicializado
    await page.waitForFunction(() => {
      const g = window.game;
      const ds = g.scene.getScene('DungeonScene');
      return ds && ds.player && ds.player.controller && ds.sys.isActive();
    }, { timeout: 10000 });

    console.log('⚔️ DungeonScene e Player prontos.');

    // 1. Validar que o dispositivo é detectado como touch / híbrido
    const isTouch = await page.evaluate(() => {
      const g = window.game;
      const ds = g.scene.getScene('DungeonScene');
      return {
        maxTouchPoints: navigator.maxTouchPoints,
        hasTouchStart: 'ontouchstart' in window,
        isTouchDeviceCheck: !!(navigator.maxTouchPoints > 0 || 'ontouchstart' in window)
      };
    });
    console.log('📱 Diagnóstico de toque:', isTouch);
    if (!isTouch.isTouchDeviceCheck) {
      throw new Error('Falha: o teste não emulou um dispositivo com touch!');
    }

    // 2. TESTE DE DISPARO DE FLECHAS COM CLIQUE DO MOUSE NO DISPOSITIVO HÍBRIDO
    const initialArrows = await page.evaluate(() => {
      const g = window.game;
      const ds = g.scene.getScene('DungeonScene');
      return ds.arrowGroup.getChildren().length;
    });

    console.log(`🏹 Flechas ativas antes do clique: ${initialArrows}`);

    // Obter posição do canvas e clicar nele
    const canvasBox = await page.locator('canvas').boundingBox();
    if (!canvasBox) throw new Error('Canvas do jogo não encontrado');

    const clickX = canvasBox.x + canvasBox.width * 0.7;
    const clickY = canvasBox.y + canvasBox.height * 0.5;

    // Disparar clique esquerdo do mouse
    console.log(`🖱️ Executando clique esquerdo em (${clickX}, ${clickY})...`);
    await page.mouse.click(clickX, clickY, { button: 'left' });

    // Aguardar alguns frames para processar o disparo da flecha
    await page.waitForTimeout(150);

    const arrowsAfterClick = await page.evaluate(() => {
      const g = window.game;
      const ds = g.scene.getScene('DungeonScene');
      return {
        arrowCount: ds.arrowGroup.getChildren().length,
        isShootingAnim: ds.player.isShootingAnim,
        facing: ds.player.facing
      };
    });

    console.log('🏹 Resultado pós-clique:', arrowsAfterClick);

    if (arrowsAfterClick.arrowCount <= initialArrows && !arrowsAfterClick.isShootingAnim) {
      throw new Error('FALHA: O clique do mouse NÃO disparou a flecha no dispositivo híbrido!');
    }
    console.log('✅ SUCESSO: Flecha disparada com clique esquerdo do mouse em dispositivo híbrido!');

    // 3. TESTE DE DESTRAVAMENTO DO ESCUDO APÓS PERDA DE FOCO (BLUR) E POINTERUP FORA DA JANELA
    console.log('🛡️ Testando defesa de escudo...');
    // Pressionar botão direito (defender)
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(100);

    const defendingStateBefore = await page.evaluate(() => {
      const g = window.game;
      const ds = g.scene.getScene('DungeonScene');
      return {
        isDefending: ds.player.isDefending,
        mouseDefendDown: ds.player.controller.mouseDefendDown
      };
    });
    console.log('🛡️ Estado da defesa (segurando botão direito):', defendingStateBefore);

    if (!defendingStateBefore.mouseDefendDown) {
      throw new Error('FALHA: Botão direito não ativou mouseDefendDown!');
    }

    // Simular blur da janela (jogador dá Alt-Tab ou clica fora da janela)
    console.log('🌫️ Disparando evento de blur na janela...');
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await page.waitForTimeout(50);

    const defendingStateAfterBlur = await page.evaluate(() => {
      const g = window.game;
      const ds = g.scene.getScene('DungeonScene');
      return {
        isDefending: ds.player.isDefending,
        mouseDefendDown: ds.player.controller.mouseDefendDown
      };
    });
    console.log('🛡️ Estado da defesa após blur:', defendingStateAfterBlur);

    if (defendingStateAfterBlur.mouseDefendDown) {
      throw new Error('FALHA: mouseDefendDown permaneceu ativo após blur da janela!');
    }
    console.log('✅ SUCESSO: Escudo destravado com sucesso após window.blur!');

    // Testar pointerup na janela
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(50);
    console.log('👆 Disparando window pointerup (soltar botão fora do canvas)...');
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { button: 2 }));
    });
    await page.waitForTimeout(50);

    const defendingStateAfterPointerUp = await page.evaluate(() => {
      const g = window.game;
      const ds = g.scene.getScene('DungeonScene');
      return ds.player.controller.mouseDefendDown;
    });

    if (defendingStateAfterPointerUp) {
      throw new Error('FALHA: mouseDefendDown permaneceu ativo após window pointerup!');
    }
    console.log('✅ SUCESSO: Escudo destravado com sucesso após window pointerup!');

    // 4. TESTE DE FEEDBACK DE ALJAVA VAZIA
    console.log('🪹 Testando feedback de aljava vazia (0 flechas)...');
    const emptyBowCheck = await page.evaluate(() => {
      const g = window.game;
      const ds = g.scene.getScene('DungeonScene');
      const player = ds.player;

      let emptyBowSoundPlayed = false;
      if (window.AudioService) {
        const original = window.AudioService.playEmptyBowClick.bind(window.AudioService);
        window.AudioService.playEmptyBowClick = () => {
          emptyBowSoundPlayed = true;
          original();
        };
      }

      // Consumir todas as flechas até 0
      while (window.GameState && window.GameState.arrows > 0) {
        window.GameState.useArrow();
      }

      // Resetar quaisquer timers de ação/cooldown anteriores
      player.actionLockTimer = 0;
      player.bowCooldownTimer = 0;
      player.isShootingAnim = false;
      player.isAttackingAnim = false;

      // Disparar tentativa de tiro sem flechas via clique
      player.controller.mouseShootTriggered = true;
      player.handleActions(ds.enemyGroup, ds.arrowGroup);

      return {
        arrowsLeft: window.GameState ? window.GameState.arrows : -1,
        bowCooldownTimer: player.bowCooldownTimer,
        emptyBowSoundPlayed,
        popupCreated: ds.children.list.some(child => child.text === 'SEM FLECHAS!')
      };
    });

    console.log('🪹 Resultado do disparo sem flechas:', emptyBowCheck);
    if (!emptyBowCheck.popupCreated) {
      throw new Error('FALHA: Popup "SEM FLECHAS!" não foi exibido quando flechas = 0!');
    }
    if (!emptyBowCheck.emptyBowSoundPlayed) {
      throw new Error('FALHA: Som playEmptyBowClick não foi acionado quando flechas = 0!');
    }
    console.log('✅ SUCESSO: Popup SEM FLECHAS! exibido e playEmptyBowClick() executado perfeitamente!');

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
  } finally {
    await browser.close();
    await server.close();
  }
}

run().catch(err => {
  console.error('❌ Erro no teste Playwright:', err);
  process.exit(1);
});
