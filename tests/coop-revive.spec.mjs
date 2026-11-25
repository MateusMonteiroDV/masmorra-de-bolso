import { startGameHarness, openGamePage, startDungeon, assertCheck } from './helpers/game.mjs';

/**
 * E2E de regressão do bug "o personagem do aliado some quando morre / vai para os confins da tela".
 * Causa: o golpe fatal aplicava knockback depois da morte e, como o herói morto não atualiza mais
 * o movimento, a velocidade nunca era zerada e ele deslizava até a borda do mapa.
 *
 * Duas abas do mesmo navegador conversam pelo BroadcastChannel do NetworkManager (sem rede externa).
 */
async function run() {
  console.log('--- Testando Morte e Reviver no Multiplayer ---');
  const harness = await startGameHarness(5194);
  const errors = [];

  try {
    const context = await harness.browser.newContext({ viewport: { width: 960, height: 540 } });
    const hostPage = await openGamePage(context, harness.baseUrl, errors);
    // O aliado joga com os controles de toque (mobile) para cobrir o joystick após reviver
    const guestPage = await openGamePage(context, harness.baseUrl, errors, '?touch');

    const roomId = `MDB-T${Date.now() % 10000}`;
    await hostPage.evaluate(id => window.NetworkManager.join(id, true), roomId);
    await guestPage.evaluate(id => window.NetworkManager.join(id, false), roomId);
    await hostPage.waitForFunction(() => window.NetworkManager.isConnected(), null, { timeout: 10000 });
    await guestPage.waitForFunction(() => window.NetworkManager.isConnected(), null, { timeout: 10000 });
    assertCheck(true, 'as duas abas se conectaram na mesma sala');

    await startDungeon(hostPage);
    await startDungeon(guestPage);

    // Remove os monstros para isolar o cenário de morte/reviver
    for (const page of [hostPage, guestPage]) {
      await page.evaluate(() => {
        const dungeon = game.scene.getScene('DungeonScene');
        dungeon.enemyGroup.clear(true, true);
        dungeon.player.teleportTo(500, 640);
      });
    }
    await hostPage.evaluate(() => game.scene.getScene('DungeonScene').player.teleportTo(560, 640));
    await hostPage.waitForFunction(() => game.scene.getScene('DungeonScene').remotePlayers.size === 1, null, { timeout: 5000, polling: 100 });

    // 1. O aliado (guest) morre com um golpe que também aplica knockback (como Minotauro/garras)
    const deathPosition = await guestPage.evaluate(() => {
      const player = game.scene.getScene('DungeonScene').player;
      player.health.takeDamage(999);
      player.movement.applyKnockback(player.x + 40, player.y, 220, 180);
      return { x: player.x, y: player.y };
    });
    await guestPage.waitForTimeout(1500);

    const guestAfterDeath = await guestPage.evaluate(() => {
      const player = game.scene.getScene('DungeonScene').player;
      return { x: player.x, y: player.y, dead: player.health.isDead() };
    });
    const guestDrift = Math.hypot(guestAfterDeath.x - deathPosition.x, guestAfterDeath.y - deathPosition.y);
    assertCheck(guestAfterDeath.dead, 'aliado morreu');
    const touchVisible = () => guestPage.evaluate(() => game.scene.getScene('UIScene').touchControls.container.visible);
    assertCheck(!(await touchVisible()), 'controles de toque somem enquanto o aliado está caído');
    assertCheck(guestDrift < 2, `corpo do aliado ficou parado onde morreu (deslocou ${guestDrift.toFixed(1)}px)`);

    // 2. Na tela do host o aliado caído continua visível, no lugar da morte
    const remoteOnHost = await hostPage.evaluate(() => {
      const remote = Array.from(game.scene.getScene('DungeonScene').remotePlayers.values())[0];
      return { x: remote.x, y: remote.y, dead: remote.isDead(), visible: remote.visible && remote.alpha > 0 && remote.active };
    });
    const remoteDrift = Math.hypot(remoteOnHost.x - deathPosition.x, remoteOnHost.y - deathPosition.y);
    assertCheck(remoteOnHost.dead && remoteOnHost.visible, 'host vê o aliado caído');
    assertCheck(remoteDrift < 6, `aliado caído não foi para os confins da tela no host (distância ${remoteDrift.toFixed(1)}px)`);

    // 3. Host chega perto e revive com [E]
    await hostPage.bringToFront(); // abas em segundo plano têm o loop do jogo pausado pelo navegador
    await hostPage.evaluate(({ x, y }) => game.scene.getScene('DungeonScene').player.teleportTo(x + 20, y), deathPosition);
    await hostPage.waitForTimeout(500);
    // Segura a tecla por alguns frames: um "press" instantâneo pode cair entre dois passos do loop
    await hostPage.keyboard.down('e');
    await hostPage.waitForTimeout(120);
    await hostPage.keyboard.up('e');
    await guestPage.waitForFunction(() => !game.scene.getScene('DungeonScene').player.health.isDead(), null, { timeout: 5000, polling: 100 });
    const revivedGuest = await guestPage.evaluate(() => {
      const player = game.scene.getScene('DungeonScene').player;
      return { hp: player.health.currentHp, max: player.health.maxHp, moves: player.body.moves };
    });
    assertCheck(revivedGuest.hp === Math.ceil(revivedGuest.max / 2), `aliado revivido com metade da vida (${revivedGuest.hp}/${revivedGuest.max})`);
    assertCheck(revivedGuest.moves, 'corpo do aliado volta a se mover após reviver');

    // 3b. Regressão: os controles de toque ficavam escondidos após reviver e o herói não andava no mobile
    assertCheck(await touchVisible(), 'controles de toque voltam após reviver');

    // 4. O aliado revivido consegue andar normalmente
    const beforeWalk = await guestPage.evaluate(() => game.scene.getScene('DungeonScene').player.x);
    await guestPage.bringToFront();
    await guestPage.keyboard.down('d');
    await guestPage.waitForTimeout(600);
    await guestPage.keyboard.up('d');
    const afterWalk = await guestPage.evaluate(() => game.scene.getScene('DungeonScene').player.x);
    assertCheck(afterWalk - beforeWalk > 20, `aliado revivido anda (${Math.round(afterWalk - beforeWalk)}px)`);

    // 5. Portal para o chefe sincroniza as duas abas
    await hostPage.evaluate(() => game.scene.getScene('DungeonScene').enterBossArena(true));
    await guestPage.waitForFunction(() => game.scene.getScene('DungeonScene').isInBossArena, null, { timeout: 5000, polling: 100 });
    assertCheck(true, 'aliado também foi teleportado para a Sala do Capetão');

    // 6. Vitória no co-op: o Capetão cai para os dois, o portal abre e cada um volta ao Lobby ao entrar nele
    for (const page of [hostPage, guestPage]) {
      await page.waitForFunction(() => game.scene.getScene('DungeonScene').enemyMap.get('boss_capetao'), null, { timeout: 8000, polling: 100 });
    }
    // O aliado cai antes do golpe final: ele deve levantar para poder andar até o portal
    await guestPage.bringToFront();
    await guestPage.evaluate(() => {
      const player = game.scene.getScene('DungeonScene').player;
      player.health.isInvulnerable = false;
      player.health.takeDamage(999);
    });
    await guestPage.waitForFunction(() => game.scene.getScene('DungeonScene').player.health.isDead(), null, { timeout: 3000, polling: 100 });
    await hostPage.bringToFront();
    await hostPage.evaluate(() => {
      const boss = game.scene.getScene('DungeonScene').enemyMap.get('boss_capetao');
      boss.health.isInvulnerable = false;
      boss.health.takeDamage(9999);
    });
    await hostPage.waitForFunction(() => game.scene.getScene('DungeonScene').isExitPortalOpen, null, { timeout: 5000, polling: 100 });
    await guestPage.bringToFront();
    await guestPage.waitForFunction(() => game.scene.getScene('DungeonScene').isExitPortalOpen, null, { timeout: 5000, polling: 100 });
    const guestVictory = await guestPage.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      return {
        alive: !dungeon.player.health.isDead(),
        bossDown: dungeon.enemyMap.get('boss_capetao').health.isDead(),
        kleberFree: dungeon.kleber.isFree,
        prompt: dungeon.exitPortalText.text
      };
    });
    assertCheck(guestVictory.bossDown && guestVictory.kleberFree, 'vitória do host chega ao aliado (Capetão caído e Kleber solto)');
    assertCheck(guestVictory.alive, 'aliado caído levanta na vitória para poder ir até o portal');
    assertCheck(guestVictory.prompt.includes('AO LOBBY'), `no co-op o portal leva ao Lobby (${guestVictory.prompt})`);

    await hostPage.bringToFront();
    await hostPage.evaluate(() => game.scene.getScene('DungeonScene').player.teleportTo(840, 214));
    await hostPage.waitForFunction(() => game.scene.isActive('LobbyScene'), null, { timeout: 5000, polling: 100 });
    await guestPage.bringToFront();
    await guestPage.waitForTimeout(800);
    const guestStays = await guestPage.evaluate(() => game.scene.isActive('DungeonScene') && !game.scene.isActive('GameOverScene'));
    assertCheck(guestStays, 'host volta ao Lobby pelo portal e o aliado continua na sala até entrar também');
    await guestPage.evaluate(() => game.scene.getScene('DungeonScene').player.teleportTo(840, 214));
    await guestPage.waitForFunction(() => game.scene.isActive('LobbyScene'), null, { timeout: 5000, polling: 100 });
    assertCheck(true, 'aliado também volta ao Lobby ao entrar no portal');

    const relevantErrors = errors.filter(error => !error.includes('CORS') && !error.includes('[vite]'));
    assertCheck(relevantErrors.length === 0, `sem erros no console (${relevantErrors.join(' | ') || 'nenhum'})`);

    await hostPage.evaluate(() => window.NetworkManager.leave());
    await guestPage.evaluate(() => window.NetworkManager.leave());
    await context.close();
  } finally {
    await harness.close();
  }

  console.log('🎉 TODOS OS TESTES DE MORTE E REVIVER PASSARAM!');
}

run().catch(err => {
  console.error('ERRO NO TESTE:', err);
  process.exit(1);
});
