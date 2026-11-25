import { startGameHarness, openGamePage, startDungeon, assertCheck } from './helpers/game.mjs';

/**
 * E2E: escala nítida, mapa novo com paredes, recompensas de onda, portal após as 8 ondas,
 * teleporte para a Sala do Capetão, luta contra o chefe e vitória.
 */
async function run() {
  console.log('--- Testando Sala Principal, Portal e Chefe Capetão ---');
  const harness = await startGameHarness(5193);
  const errors = [];

  try {
    const context = await harness.browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await openGamePage(context, harness.baseUrl, errors);

    // 1. Escala inteira (nitidez): 1280x720 => 640x360 lógicos com zoom exato 2
    const scale = await page.evaluate(() => ({ width: game.scale.width, height: game.scale.height, zoom: game.scale.zoom }));
    assertCheck(scale.zoom === 2 && scale.width === 640 && scale.height === 360, `canvas com escala inteira (${JSON.stringify(scale)})`);

    await page.evaluate(() => localStorage.clear());
    await startDungeon(page);

    // 2. Mapa novo carregado e paredes seguram o herói
    const mapInfo = await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      return { texture: dungeon.mapBackground.texture.key, bounds: [dungeon.physics.world.bounds.width, dungeon.physics.world.bounds.height] };
    });
    assertCheck(mapInfo.texture === 'mapa_sala_principal' && mapInfo.bounds[0] === 1254, `sala principal carregada (${JSON.stringify(mapInfo)})`);

    await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      dungeon.enemyGroup.getChildren().forEach(enemy => enemy.setActive(false));
      dungeon.player.teleportTo(200, 640);
    });
    await page.keyboard.down('a');
    await page.waitForTimeout(1200);
    await page.keyboard.up('a');
    const leftX = await page.evaluate(() => game.scene.getScene('DungeonScene').player.body.x);
    assertCheck(leftX >= 110, `parede esquerda bloqueia o herói (body.x=${Math.round(leftX)})`);
    await page.evaluate(() => game.scene.getScene('DungeonScene').enemyGroup.getChildren().forEach(enemy => enemy.setActive(true)));

    // 3. Movimento com aceleração: não atinge velocidade máxima no primeiro frame e para suavemente
    await page.evaluate(() => game.scene.getScene('DungeonScene').player.teleportTo(627, 640));
    await page.keyboard.down('d');
    await page.waitForTimeout(400);
    const movingSpeed = await page.evaluate(() => game.scene.getScene('DungeonScene').player.body.velocity.x);
    await page.keyboard.up('d');
    await page.waitForTimeout(500);
    const stoppedSpeed = await page.evaluate(() => game.scene.getScene('DungeonScene').player.body.velocity.x);
    assertCheck(movingSpeed > 90 && stoppedSpeed === 0, `herói acelera (${Math.round(movingSpeed)}px/s) e para por completo`);

    // 4. Concluir a onda 1 dá bônus de ouro e cura
    await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      dungeon.player.health.currentHp = 5;
      dungeon.enemyGroup.getChildren().slice().forEach(enemy => enemy.health.takeDamage(999));
    });
    await page.waitForTimeout(600);
    const reward = await page.evaluate(() => ({ gold: GameState.runGold, hp: game.scene.getScene('DungeonScene').player.health.currentHp }));
    assertCheck(reward.gold >= 8, `bônus de onda concluída creditado (${reward.gold} G)`);
    assertCheck(reward.hp === 8, `herói curado ao concluir a onda (HP ${reward.hp})`);

    // 5. Regressão: a onda não avança duas vezes quando a sincronização do host chega antes do timer local
    await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      dungeon.waveManager.currentWave = 1;
      dungeon.waveManager.nextWave();
    });
    await page.waitForTimeout(3500);
    const waveAfterSync = await page.evaluate(() => game.scene.getScene('DungeonScene').waveManager.currentWave);
    assertCheck(waveAfterSync === 2, `onda não avançou em dobro (onda atual: ${waveAfterSync})`);

    // 6. Pular para a onda 8 e derrotá-la: Rei Slime deixa baú que pode ser aberto
    await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      dungeon.enemyGroup.clear(true, true);
      dungeon.waveManager.currentWave = 7;
      dungeon.waveManager.nextWave();
    });
    await page.waitForTimeout(300);
    const chestsBefore = await page.evaluate(() => game.scene.getScene('DungeonScene').chests.length);
    await page.evaluate(() => game.scene.getScene('DungeonScene').enemyGroup.getChildren().slice().forEach(enemy => enemy.health.takeDamage(999)));
    await page.waitForTimeout(800);
    const portalState = await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      return { open: dungeon.isBossPortalOpen, chests: dungeon.chests.length };
    });
    assertCheck(portalState.chests === chestsBefore + 1, 'baú do Rei Slime registrado na cena (pode ser aberto)');
    assertCheck(portalState.open, 'portal do Capetão aberto após as 8 ondas');

    // 7. Prompt "[E] Abrir" aparece só de chegar perto do baú (antes exigia apertar E)
    await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      const chest = dungeon.chests[0];
      dungeon.player.teleportTo(chest.x, chest.y + 10);
    });
    await page.waitForTimeout(200);
    const promptVisible = await page.evaluate(() => !!game.scene.getScene('DungeonScene').chests[0].promptText);
    assertCheck(promptVisible, 'aviso [E] Abrir aparece ao se aproximar do baú');

    // 8. Entrar no portal teleporta para a Sala do Capetão
    await page.evaluate(() => game.scene.getScene('DungeonScene').player.teleportTo(627, 185));
    await page.waitForFunction(() => game.scene.getScene('DungeonScene').enemyMap.get('boss_capetao'), null, { timeout: 5000 });
    const bossRoom = await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      const boss = dungeon.enemyMap.get('boss_capetao');
      return {
        texture: dungeon.mapBackground.texture.key,
        playerY: Math.round(dungeon.player.y),
        bossHp: boss.health.currentHp,
        bossScale: boss.scaleX,
        anim: boss.anims.currentAnim?.key
      };
    });
    assertCheck(bossRoom.texture === 'mapa_sala_chefe', 'teleportado para a Sala do Capetão');
    assertCheck(bossRoom.bossHp === 150 && bossRoom.bossScale === 2, `Capetão surgiu (HP ${bossRoom.bossHp}, escala ${bossRoom.bossScale})`);
    assertCheck(bossRoom.anim?.startsWith('capetao_'), `Capetão animado (${bossRoom.anim})`);

    // 9. Capetão ataca: aproxima o herói e espera dano por garra/fogo
    await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      dungeon.player.health.currentHp = 10;
      const boss = dungeon.enemyMap.get('boss_capetao');
      dungeon.player.teleportTo(boss.x + 40, boss.y);
    });
    await page.waitForTimeout(3000);
    const playerHpAfterBoss = await page.evaluate(() => game.scene.getScene('DungeonScene').player.health.currentHp);
    assertCheck(playerHpAfterBoss < 10, `Capetão causou dano ao herói (HP ${playerHpAfterBoss})`);

    // 10. Fase 2 abaixo de 50% e derrota leva à vitória com ouro guardado no cofre
    await page.evaluate(() => {
      const dungeon = game.scene.getScene('DungeonScene');
      dungeon.player.health.currentHp = 10;
      dungeon.player.teleportTo(768, 800);
      const boss = dungeon.enemyMap.get('boss_capetao');
      boss.health.isInvulnerable = false;
      boss.health.takeDamage(80);
    });
    const enraged = await page.evaluate(() => game.scene.getScene('DungeonScene').enemyMap.get('boss_capetao').isEnraged);
    assertCheck(enraged, 'Capetão entra em fúria abaixo de 50% de vida');

    const goldBeforeVictory = await page.evaluate(() => GameState.bankedGold + GameState.runGold);
    await page.evaluate(() => {
      const boss = game.scene.getScene('DungeonScene').enemyMap.get('boss_capetao');
      boss.health.isInvulnerable = false;
      boss.health.takeDamage(999);
    });
    await page.waitForFunction(() => game.scene.isActive('GameOverScene'), null, { timeout: 8000 });
    const victory = await page.evaluate(() => ({ banked: GameState.bankedGold, bossKills: GameState.totalBossKills }));
    assertCheck(victory.banked >= goldBeforeVictory, `vitória registrada e ouro guardado no cofre (${victory.banked} G)`);

    const relevantErrors = errors.filter(error => !error.includes('CORS'));
    assertCheck(relevantErrors.length === 0, `sem erros no console (${relevantErrors.join(' | ') || 'nenhum'})`);
    await context.close();
  } finally {
    await harness.close();
  }

  console.log('🎉 TODOS OS TESTES DA SALA DO CAPETÃO PASSARAM!');
}

run().catch(err => {
  console.error('ERRO NO TESTE:', err);
  process.exit(1);
});
