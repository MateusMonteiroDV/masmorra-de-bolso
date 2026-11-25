import assert from 'node:assert/strict';
import { createServer } from 'vite';

/**
 * Testes unitários da lógica pura (sem Phaser): escala de tela, paredes das arenas,
 * posições das ondas, curva de dificuldade e economia de moedas.
 * Os módulos TypeScript são carregados pelo próprio Vite (ssrLoadModule).
 */
async function run() {
  const server = await createServer({ logLevel: 'error', server: { middlewareMode: true } });
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push(`✅ ${name}`);
    } catch (err) {
      results.push(`❌ ${name}\n   ${err.message}`);
      process.exitCode = 1;
    }
  };

  try {
    const { computePixelViewport } = await server.ssrLoadModule('/src/core/PixelScale.ts');
    const { MAIN_ARENA, BOSS_ARENA, buildWallRects, isPointInsidePolygon, getPolygonSpansAtY } =
      await server.ssrLoadModule('/src/dungeon/ArenaLayouts.ts');
    const { WAVE_CONFIGS, getWaveClearBonus } = await server.ssrLoadModule('/src/dungeon/WaveConfigs.ts');
    const { CAPETAO_MINION_SPAWN_POINTS, CAPETAO_MINION_HORDES, planCapetaoHorde, getCapetaoHordeInterval } =
      await server.ssrLoadModule('/src/dungeon/CapetaoMinions.ts');
    const { splitCoinReward } = await server.ssrLoadModule('/src/core/Economy.ts');
    const { CONSTANTS } = await server.ssrLoadModule('/src/core/Constants.ts');
    const { clearReleasedVirtualFlags } = await server.ssrLoadModule('/src/core/PointerFlags.ts');

    // ---------- Mouse (regressão: parava de atirar/defender após clicar em menus) ----------
    await test('PointerFlags: novo clique limpa a marca de controle virtual do mouse solto', () => {
      const mousePointer = { isDown: false, isVirtualControl: true };
      clearReleasedVirtualFlags([mousePointer]);
      assert.equal(mousePointer.isVirtualControl, false);
    });

    await test('PointerFlags: dedo ainda segurando o joystick mantém a marca', () => {
      const joystickPointer = { isDown: true, isVirtualControl: true };
      const mousePointer = { isDown: false, isVirtualControl: true };
      clearReleasedVirtualFlags([mousePointer, joystickPointer, undefined]);
      assert.equal(joystickPointer.isVirtualControl, true);
      assert.equal(mousePointer.isVirtualControl, false);
    });

    // ---------- Escala pixel-perfect ----------
    await test('PixelScale: 1920x1080 @1x usa fator inteiro 4 e mantém 480x270', () => {
      const viewport = computePixelViewport(1920, 1080, 1, 480, 270);
      assert.equal(viewport.pixelScale, 4);
      assert.equal(viewport.width, 480);
      assert.equal(viewport.height, 270);
      assert.equal(viewport.zoom, 4);
    });

    await test('PixelScale: 1280x720 @1x usa fator inteiro 2 (sem esticamento fracionário)', () => {
      const viewport = computePixelViewport(1280, 720, 1, 480, 270);
      assert.equal(viewport.pixelScale, 2);
      assert.equal(viewport.width, 640);
      assert.equal(viewport.height, 360);
    });

    await test('PixelScale: celular 844x390 @3x calcula em pixels físicos e preenche a tela', () => {
      const viewport = computePixelViewport(844, 390, 3, 480, 270);
      assert.ok(Number.isInteger(viewport.pixelScale), 'fator precisa ser inteiro');
      assert.equal(viewport.pixelScale, 4);
      assert.ok(viewport.width >= 480 && viewport.height >= 270);
      // Tamanho CSS final não pode passar da tela (sem barra de rolagem/corte)
      assert.ok(viewport.width * viewport.zoom <= 844 + 0.001);
      assert.ok(viewport.height * viewport.zoom <= 390 + 0.001);
    });

    await test('PixelScale: telas menores que a base reduzem proporcionalmente (fator < 1)', () => {
      const viewport = computePixelViewport(400, 225, 1, 480, 270);
      assert.ok(viewport.pixelScale < 1);
      assert.ok(Math.abs(viewport.width - 480) <= 1);
    });

    // ---------- Arenas e paredes ----------
    for (const arena of [MAIN_ARENA, BOSS_ARENA]) {
      const walls = buildWallRects(arena.floorPolygon, arena.width, arena.height);
      const isInsideWall = (point) => walls.some(wall =>
        point.x > wall.x && point.x < wall.x + wall.width && point.y > wall.y && point.y < wall.y + wall.height
      );

      await test(`Arena ${arena.key}: paredes não cobrem o spawn do jogador`, () => {
        assert.ok(isPointInsidePolygon(arena.floorPolygon, arena.playerSpawn));
        assert.ok(!isInsideWall(arena.playerSpawn));
      });

      await test(`Arena ${arena.key}: bordas do mapa ficam totalmente bloqueadas`, () => {
        for (const point of [{ x: 5, y: 5 }, { x: arena.width - 5, y: 5 }, { x: 5, y: arena.height - 5 }, { x: arena.width - 5, y: arena.height - 5 }, { x: arena.width / 2, y: 5 }]) {
          assert.ok(isInsideWall(point), `ponto ${JSON.stringify(point)} deveria ser parede`);
        }
      });

      await test(`Arena ${arena.key}: paredes cobrem todo o mapa fora do piso (sem buracos)`, () => {
        for (let y = 8; y < arena.height; y += 32) {
          for (let x = 8; x < arena.width; x += 32) {
            const point = { x, y };
            const insideFloor = getPolygonSpansAtY(arena.floorPolygon, y).some(([startX, endX]) => x > startX + 20 && x < endX - 20);
            const outsideFloor = !isPointInsidePolygon(arena.floorPolygon, point);
            if (outsideFloor) {
              const nearEdge = getPolygonSpansAtY(arena.floorPolygon, y).some(([startX, endX]) => Math.abs(x - startX) < 20 || Math.abs(x - endX) < 20);
              if (!nearEdge) assert.ok(isInsideWall(point), `buraco na parede em ${x},${y}`);
            }
            if (insideFloor) assert.ok(!isInsideWall(point), `parede invadindo o piso em ${x},${y}`);
          }
        }
      });
    }

    await test('Arena principal: portal do chefe fica no piso, junto à porta norte', () => {
      const portal = MAIN_ARENA.bossPortal;
      assert.ok(portal);
      assert.ok(isPointInsidePolygon(MAIN_ARENA.floorPolygon, portal));
      assert.ok(portal.y < 250, 'portal deveria estar no norte da sala');
    });

    await test('Arena do chefe: spawn do Capetão fica no piso e longe do herói', () => {
      assert.ok(isPointInsidePolygon(BOSS_ARENA.floorPolygon, BOSS_ARENA.bossSpawn));
      const distance = Math.hypot(BOSS_ARENA.bossSpawn.x - BOSS_ARENA.playerSpawn.x, BOSS_ARENA.bossSpawn.y - BOSS_ARENA.playerSpawn.y);
      assert.ok(distance > 300);
    });

    await test('Arena do chefe: Kleber fica amarrado no topo do santuário, acima do Capetão', () => {
      const hostage = BOSS_ARENA.hostageSpawn;
      const topOfFloor = Math.min(...BOSS_ARENA.floorPolygon.map(point => point.y));
      assert.ok(isPointInsidePolygon(BOSS_ARENA.floorPolygon, hostage));
      assert.ok(hostage.y - topOfFloor < 40, `Kleber a ${hostage.y - topOfFloor}px do topo`);
      assert.ok(hostage.y < BOSS_ARENA.bossSpawn.y);
      assert.equal(CONSTANTS.ENEMIES.CAPETAO.RESCUE_GOLD, 500);
    });

    // ---------- Lacaios do Capetão ----------
    await test('Lacaios do Capetão: pontos de invocação no piso e longe do spawn do herói', () => {
      CAPETAO_MINION_SPAWN_POINTS.forEach(point => {
        assert.ok(isPointInsidePolygon(BOSS_ARENA.floorPolygon, point), `${JSON.stringify(point)} fora do piso`);
        const distance = Math.hypot(point.x - BOSS_ARENA.playerSpawn.x, point.y - BOSS_ARENA.playerSpawn.y);
        assert.ok(distance >= CONSTANTS.ENEMIES.CAPETAO.MINION_SAFE_DISTANCE, `${JSON.stringify(point)} colado no herói`);
      });
    });

    await test('Lacaios do Capetão: hordas se repetem em ciclo e respeitam o limite de vivos', () => {
      const maxAlive = CONSTANTS.ENEMIES.CAPETAO.MINION_MAX_ALIVE;
      const kindsOf = horde => horde.map(spawn => spawn.kind);
      assert.deepEqual(kindsOf(planCapetaoHorde(1, 0, [])), CAPETAO_MINION_HORDES[0]);
      assert.deepEqual(
        kindsOf(planCapetaoHorde(CAPETAO_MINION_HORDES.length + 1, 0, [])),
        CAPETAO_MINION_HORDES[0],
        'a lista de hordas recomeça (spawn sem fim até o chefe morrer)'
      );
      assert.equal(planCapetaoHorde(1, maxAlive - 1, []).length, 1);
      assert.equal(planCapetaoHorde(1, maxAlive, []).length, 0);
      assert.equal(planCapetaoHorde(1, maxAlive + 3, []).length, 0);
    });

    await test('Lacaios do Capetão: não nascem em cima dos heróis', () => {
      const hero = CAPETAO_MINION_SPAWN_POINTS[0];
      for (let horde = 1; horde <= 12; horde++) {
        planCapetaoHorde(horde, 0, [hero]).forEach(spawn => {
          assert.ok(Math.hypot(spawn.x - hero.x, spawn.y - hero.y) >= CONSTANTS.ENEMIES.CAPETAO.MINION_SAFE_DISTANCE);
        });
      }
    });

    await test('Lacaios do Capetão: hordas ficam mais frequentes na fúria', () => {
      assert.ok(getCapetaoHordeInterval(true) < getCapetaoHordeInterval(false));
    });

    // ---------- Ondas ----------
    await test('Ondas: 8 ondas, todos os spawns no piso, fora de obstáculos e longe do herói', () => {
      assert.equal(WAVE_CONFIGS.length, 8);
      WAVE_CONFIGS.forEach(config => {
        const positions = [
          ...config.slimes, ...(config.bats ?? []), ...config.mages, ...(config.minotaurs ?? []),
          ...(config.bossPos ? [config.bossPos] : [])
        ];
        positions.forEach(position => {
          assert.ok(isPointInsidePolygon(MAIN_ARENA.floorPolygon, position), `onda ${config.waveNumber}: ${JSON.stringify(position)} fora do piso`);
          const insideObstacle = MAIN_ARENA.obstacles.some(obstacle =>
            position.x >= obstacle.x && position.x <= obstacle.x + obstacle.width &&
            position.y >= obstacle.y && position.y <= obstacle.y + obstacle.height
          );
          assert.ok(!insideObstacle, `onda ${config.waveNumber}: spawn dentro de obstáculo`);
          const distanceToPlayer = Math.hypot(position.x - MAIN_ARENA.playerSpawn.x, position.y - MAIN_ARENA.playerSpawn.y);
          assert.ok(distanceToPlayer >= 100, `onda ${config.waveNumber}: spawn colado no herói (${Math.round(distanceToPlayer)}px)`);
        });
      });
    });

    await test('Dificuldade (regressão): multiplicadores crescem e o dano não passa de 1.5x', () => {
      let previousHp = 0;
      WAVE_CONFIGS.forEach(config => {
        assert.ok(config.hpMult >= previousHp);
        previousHp = config.hpMult;
        assert.ok(config.damageMult <= 1.5, `onda ${config.waveNumber} com dano ${config.damageMult}x`);
        assert.ok(config.hpMult <= 1.8, `onda ${config.waveNumber} com vida ${config.hpMult}x`);
        assert.ok(config.speedMult <= 1.2, `onda ${config.waveNumber} com velocidade ${config.speedMult}x`);
      });
    });

    await test('Dificuldade (regressão): golpe mais forte das ondas não tira metade da vida base', () => {
      const strongest = Math.max(
        ...WAVE_CONFIGS.map(config => Math.round(CONSTANTS.ENEMIES.MINOTAUR.DAMAGE * config.damageMult)),
        ...WAVE_CONFIGS.map(config => Math.round(CONSTANTS.ENEMIES.MAGE.DAMAGE * config.damageMult))
      );
      assert.ok(strongest < CONSTANTS.PLAYER.BASE_MAX_HP / 2, `golpe de ${strongest} HP`);
    });

    // ---------- Economia ----------
    await test('Economia: bônus de onda cresce com a onda', () => {
      assert.equal(getWaveClearBonus(1), 8);
      assert.ok(getWaveClearBonus(8) > getWaveClearBonus(1));
    });

    await test('Economia: divisão de moedas nunca perde ouro e respeita o limite de moedas', () => {
      for (const total of [1, 2, 5, 6, 7, 13, 52, 104]) {
        const coins = splitCoinReward(total, CONSTANTS.ECONOMY.MAX_COINS_PER_DROP);
        assert.equal(coins.reduce((sum, value) => sum + value, 0), total);
        assert.ok(coins.length <= CONSTANTS.ECONOMY.MAX_COINS_PER_DROP);
        assert.ok(coins.every(value => value >= 1));
      }
    });

    await test('Economia (regressão): monstros dão mais ouro que antes', () => {
      assert.ok(CONSTANTS.ENEMIES.SLIME.XP_OR_GOLD >= 2);
      assert.ok(CONSTANTS.ENEMIES.MINOTAUR.XP_OR_GOLD >= 8);
      assert.ok(CONSTANTS.ENEMIES.CAPETAO.XP_OR_GOLD > CONSTANTS.ENEMIES.BOSS.XP_OR_GOLD);
    });
  } finally {
    await server.close();
  }

  console.log(results.join('\n'));
  if (process.exitCode) {
    console.error('\n💥 Testes unitários falharam.');
  } else {
    console.log(`\n🎉 ${results.length} testes unitários passaram.`);
  }
}

run().catch(err => {
  console.error('ERRO NOS TESTES UNITÁRIOS:', err);
  process.exit(1);
});
