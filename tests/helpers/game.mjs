import { chromium } from 'playwright';
import { createServer } from 'vite';
import { resolveChromePath } from './browser.mjs';

/** Sobe o Vite em processo e abre o Chromium headless usado pelos testes E2E. */
export async function startGameHarness(port) {
  const server = await createServer({
    server: { port, host: '127.0.0.1' },
    logLevel: 'error'
  });
  await server.listen();
  const address = server.httpServer?.address();
  const baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : port}`;

  const browser = await chromium.launch({
    executablePath: resolveChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const close = async () => {
    await browser.close();
    await server.close();
  };

  return { server, browser, baseUrl, close };
}

/**
 * Cria uma página isolada da rede externa (relays Nostr, TURN e logger remoto),
 * mantendo o multiplayer local via BroadcastChannel entre abas do mesmo contexto.
 */
export async function openGamePage(context, baseUrl, errors) {
  await context.route(url => !url.toString().startsWith(baseUrl), route => route.abort());
  if (typeof context.routeWebSocket === 'function') {
    const localHost = new URL(baseUrl).host;
    await context.routeWebSocket(url => new URL(url.toString()).host !== localHost, ws => ws.close());
  }

  const page = await context.newPage();
  page.on('pageerror', err => errors.push(String(err?.stack || err)));
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('Failed to load resource') && !text.includes('net::ERR')) {
      errors.push(text);
    }
  });

  await page.goto(baseUrl);
  await page.waitForFunction(() => window.game?.scene?.isActive('TitleScene'), null, { timeout: 20000 });
  return page;
}

/** Inicia a masmorra diretamente (como o Hub faz) e aguarda o herói existir. */
export async function startDungeon(page) {
  await page.evaluate(() => {
    const game = window.game;
    game.scene.getScenes(true).forEach(scene => game.scene.stop(scene.scene.key));
    window.GameState.startNewRun();
    game.scene.start('DungeonScene');
    game.scene.start('UIScene');
  });
  await page.waitForFunction(() => {
    const dungeon = window.game.scene.getScene('DungeonScene');
    return dungeon?.player?.active && dungeon.sys.isActive();
  }, null, { timeout: 10000 });
}

export function assertCheck(condition, message) {
  if (!condition) throw new Error(`FALHA: ${message}`);
  console.log(`✅ ${message}`);
}
