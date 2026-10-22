import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function run() {
  console.log('--- Testando RoomInputDialog e Imobilidade do Jogador ---');
  const server = spawn('npx', ['vite', '--port', '5192'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

  await page.goto('http://127.0.0.1:5192');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Iniciar na HubScene
  const hubActive = await page.evaluate(() => window.game?.scene?.isActive('HubScene'));
  console.log('HubScene ativa:', hubActive);

  const initialPos = await page.evaluate(() => {
    const hub = window.game.scene.getScene('HubScene');
    return { x: hub.player.x, y: hub.player.y };
  });
  console.log('Posição inicial do jogador:', initialPos);

  // Abre RoomInputDialog
  let confirmedCode = null;
  await page.evaluate(() => {
    window.lastConfirmedRoomCode = null;
    const { RoomInputDialog } = window;
    // Dispara via cena
    const hub = window.game.scene.getScene('HubScene');
    hub.openMultiplayerModal();
  });
  await page.waitForTimeout(500);

  // Clica no botão de conectar com ID
  await page.evaluate(() => {
    const hub = window.game.scene.getScene('HubScene');
    const modal = hub.multiplayerModal;
    const joinBtn = modal.bgContainer.list.find(c => c.text && c.text.includes('CONECTAR COM ID'));
    joinBtn.emit('pointerdown');
  });
  await page.waitForSelector('#mdb-room-input-modal input', { state: 'visible' });
  console.log('Modal RoomInputDialog aberto com sucesso!');

  // Digita teclas de movimento WASD no input SEM shift e sem caps lock!
  console.log('Digitando w, a, s, d e número de sala no input...');
  const input = await page.$('#mdb-room-input-modal input');
  await input.focus();

  // Digita "wasd" para testar se move
  await page.keyboard.type('wasd');
  await page.waitForTimeout(300);

  const posAfterWasd = await page.evaluate(() => {
    const hub = window.game.scene.getScene('HubScene');
    return { x: hub.player.x, y: hub.player.y };
  });
  console.log('Posição após digitar wasd:', posAfterWasd);

  if (initialPos.x !== posAfterWasd.x || initialPos.y !== posAfterWasd.y) {
    throw new Error(`FALHA: O jogador se moveu enquanto digitava no input! Inicial: ${JSON.stringify(initialPos)}, Atual: ${JSON.stringify(posAfterWasd)}`);
  }
  console.log('✅ SUCESSO: Jogador permaneceu perfeitamente IMÓVEL enquanto digitava WASD!');

  // Limpa e digita código em minúsculo com espaços: " mdb 4589 "
  await input.fill('');
  await page.keyboard.type('mdb 4589');
  await page.waitForTimeout(200);

  // Pressiona Enter
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  const currentRoom = await page.evaluate(() => window.NetworkManager.currentRoomId);
  console.log('Código conectado após digitar em minúsculo e com espaços:', currentRoom);

  if (currentRoom !== 'MDB-4589') {
    throw new Error(`FALHA: Código não foi normalizado para MDB-4589! Obtido: ${currentRoom}`);
  }
  console.log('✅ SUCESSO: Código "mdb 4589" foi perfeitamente normalizado para MDB-4589!');

  const modalGone = await page.$('#mdb-room-input-modal');
  console.log('Modal fechado após confirmação?', modalGone === null);

  await browser.close();
  server.kill();
  console.log('🎉 TODOS OS TESTES DE DIGITAÇÃO E IMOBILIDADE PASSARAM!');
}

run().catch(err => {
  console.error('ERRO NO TESTE:', err);
  process.exit(1);
});
