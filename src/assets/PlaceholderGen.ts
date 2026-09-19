import * as Phaser from 'phaser';
import { ASSET_KEYS } from './AssetManifest';

/**
 * Gera texturas procedurais estilo Pixel Art 16x16 no TextureManager.
 * Dessa forma, todo o jogo é 100% testável e funcional mesmo antes
 * do artista finalizar as ilustrações finais.
 */
export function generateProceduralPlaceholders(scene: Phaser.Scene) {
  const textures = scene.textures;

  // 1. Chão da Masmorra (16x16)
  if (!textures.exists(ASSET_KEYS.ENVIRONMENT.FLOOR)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1a1c23); // Pedra escura
    g.fillRect(0, 0, 16, 16);
    g.lineStyle(1, 0x282c37, 0.7);
    g.strokeRect(0.5, 0.5, 15, 15);
    g.fillStyle(0x232731);
    g.fillRect(3, 4, 3, 2);
    g.fillRect(10, 11, 4, 2);
    g.generateTexture(ASSET_KEYS.ENVIRONMENT.FLOOR, 16, 16);
    g.destroy();
  }

  // 2. Parede da Masmorra (16x16)
  if (!textures.exists(ASSET_KEYS.ENVIRONMENT.WALL)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x383e4e);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x4a5268);
    g.fillRect(1, 1, 14, 6);
    g.fillRect(1, 8, 14, 7);
    g.fillStyle(0x232731);
    g.fillRect(0, 7, 16, 1);
    g.fillRect(7, 1, 1, 6);
    g.fillRect(10, 8, 1, 7);
    g.generateTexture(ASSET_KEYS.ENVIRONMENT.WALL, 16, 16);
    g.destroy();
  }

  // 3. Jogador Herói (16x16)
  if (!textures.exists(ASSET_KEYS.CHARACTERS.PLAYER)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Sombra
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(8, 14, 10, 4);
    // Corpo / Armadura Azul
    g.fillStyle(0x2563eb);
    g.fillRect(5, 7, 6, 7);
    // Cabeça / Elmo
    g.fillStyle(0x60a5fa);
    g.fillRect(5, 2, 6, 5);
    // Viseira Dourada
    g.fillStyle(0xfbbf24);
    g.fillRect(6, 4, 4, 2);
    // Espada nas costas
    g.fillStyle(0xe2e8f0);
    g.fillRect(11, 4, 2, 6);
    g.fillStyle(0xd97706);
    g.fillRect(10, 8, 4, 1);
    g.generateTexture(ASSET_KEYS.CHARACTERS.PLAYER, 16, 16);
    g.destroy();
  }

  // 4. Inimigo Slime (16x16)
  if (!textures.exists(ASSET_KEYS.CHARACTERS.SLIME)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 14, 12, 4);
    // Corpo verde geléia
    g.fillStyle(0x10b981);
    g.fillRoundedRect(3, 5, 10, 9, 3);
    g.fillStyle(0x34d399);
    g.fillRect(4, 6, 8, 3);
    // Olhos
    g.fillStyle(0x064e3b);
    g.fillRect(5, 8, 2, 2);
    g.fillRect(9, 8, 2, 2);
    g.generateTexture(ASSET_KEYS.CHARACTERS.SLIME, 16, 16);
    g.destroy();
  }

  // 5. Inimigo Morcego (16x16)
  if (!textures.exists(ASSET_KEYS.CHARACTERS.BAT)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Asas Roxas
    g.fillStyle(0x7c3aed);
    g.fillTriangle(2, 4, 7, 9, 1, 11);
    g.fillTriangle(14, 4, 9, 9, 15, 11);
    // Corpo
    g.fillStyle(0x5b21b6);
    g.fillCircle(8, 8, 4);
    // Olhos vermelhos brilhantes
    g.fillStyle(0xef4444);
    g.fillRect(6, 7, 1, 2);
    g.fillRect(9, 7, 1, 2);
    g.generateTexture(ASSET_KEYS.CHARACTERS.BAT, 16, 16);
    g.destroy();
  }

  // 6. Inimigo Esqueleto Mago (16x16)
  if (!textures.exists(ASSET_KEYS.CHARACTERS.MAGE)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Manto Roxo Escuro
    g.fillStyle(0x4c1d95);
    g.fillRect(4, 6, 8, 9);
    // Capuz e Crânio
    g.fillStyle(0x6d28d9);
    g.fillRect(4, 2, 8, 5);
    g.fillStyle(0xf1f5f9);
    g.fillRect(6, 3, 4, 3);
    // Olho mágico brilhante
    g.fillStyle(0x06b6d4);
    g.fillRect(7, 4, 2, 1);
    // Cajado
    g.fillStyle(0x78350f);
    g.fillRect(2, 2, 2, 13);
    g.fillStyle(0x06b6d4);
    g.fillCircle(3, 2, 2);
    g.generateTexture(ASSET_KEYS.CHARACTERS.MAGE, 16, 16);
    g.destroy();
  }

  // 7. Chefe Rei Slime (32x32)
  if (!textures.exists(ASSET_KEYS.CHARACTERS.BOSS)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(16, 28, 26, 7);
    // Corpo Slime Gigante
    g.fillStyle(0x059669);
    g.fillRoundedRect(4, 10, 24, 18, 6);
    g.fillStyle(0x10b981);
    g.fillRoundedRect(6, 12, 20, 14, 4);
    // Olhos bravos
    g.fillStyle(0x022c22);
    g.fillRect(9, 16, 3, 3);
    g.fillRect(20, 16, 3, 3);
    // Coroa Dourada Real
    g.fillStyle(0xf59e0b);
    g.fillRect(9, 6, 14, 4);
    g.fillTriangle(9, 6, 11, 2, 13, 6);
    g.fillTriangle(14, 6, 16, 1, 18, 6);
    g.fillTriangle(19, 6, 21, 2, 23, 6);
    // Rubi na coroa
    g.fillStyle(0xef4444);
    g.fillRect(15, 7, 2, 2);
    g.generateTexture(ASSET_KEYS.CHARACTERS.BOSS, 32, 32);
    g.destroy();
  }

  // 8. NPC da Loja no Hub (16x16)
  if (!textures.exists(ASSET_KEYS.CHARACTERS.NPC_SHOP)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xb45309);
    g.fillRect(4, 5, 8, 10);
    g.fillStyle(0x78350f);
    g.fillRect(4, 2, 8, 4);
    g.fillStyle(0xfde68a);
    g.fillRect(6, 4, 4, 2);
    g.fillStyle(0xf59e0b);
    g.fillCircle(12, 10, 3); // Sacola de ouro
    g.generateTexture(ASSET_KEYS.CHARACTERS.NPC_SHOP, 16, 16);
    g.destroy();
  }

  // 9. Portas Abertas e Trancadas (16x16)
  if (!textures.exists(ASSET_KEYS.ENVIRONMENT.DOOR_OPEN)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x10b981);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x064e3b);
    g.fillRect(2, 2, 12, 14);
    g.generateTexture(ASSET_KEYS.ENVIRONMENT.DOOR_OPEN, 16, 16);
    g.destroy();
  }

  if (!textures.exists(ASSET_KEYS.ENVIRONMENT.DOOR_LOCKED)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xef4444);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x450a0a);
    g.fillRect(2, 2, 12, 14);
    // Barras de ferro
    g.fillStyle(0x991b1b);
    g.fillRect(4, 2, 2, 14);
    g.fillRect(10, 2, 2, 14);
    g.fillRect(2, 8, 12, 2);
    g.generateTexture(ASSET_KEYS.ENVIRONMENT.DOOR_LOCKED, 16, 16);
    g.destroy();
  }

  // 10. Fogueira do Hub (16x16)
  if (!textures.exists(ASSET_KEYS.ENVIRONMENT.CAMPFIRE)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x78350f);
    g.fillRect(3, 11, 10, 3);
    g.fillStyle(0xf97316);
    g.fillTriangle(4, 11, 8, 3, 12, 11);
    g.fillStyle(0xfde047);
    g.fillTriangle(6, 11, 8, 6, 10, 11);
    g.generateTexture(ASSET_KEYS.ENVIRONMENT.CAMPFIRE, 16, 16);
    g.destroy();
  }

  // 11. Portal para Masmorra (24x24)
  if (!textures.exists(ASSET_KEYS.ENVIRONMENT.PORTAL)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x8b5cf6, 0.4);
    g.fillCircle(12, 12, 11);
    g.fillStyle(0x6d28d9);
    g.fillCircle(12, 12, 8);
    g.fillStyle(0xa78bfa);
    g.fillCircle(12, 12, 4);
    g.generateTexture(ASSET_KEYS.ENVIRONMENT.PORTAL, 24, 24);
    g.destroy();
  }

  // 12. Moeda de Ouro (10x10)
  if (!textures.exists(ASSET_KEYS.ITEMS.COIN)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xf59e0b);
    g.fillCircle(5, 5, 4);
    g.fillStyle(0xfef08a);
    g.fillCircle(4, 4, 2);
    g.generateTexture(ASSET_KEYS.ITEMS.COIN, 10, 10);
    g.destroy();
  }

  // 13. Baú Fechado e Aberto (16x16)
  if (!textures.exists(ASSET_KEYS.ITEMS.CHEST)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x92400e);
    g.fillRect(2, 4, 12, 10);
    g.fillStyle(0xf59e0b);
    g.fillRect(1, 4, 14, 2);
    g.fillRect(7, 7, 2, 3); // Fechadura
    g.generateTexture(ASSET_KEYS.ITEMS.CHEST, 16, 16);
    g.destroy();
  }

  if (!textures.exists(ASSET_KEYS.ITEMS.CHEST_OPEN)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x92400e);
    g.fillRect(2, 7, 12, 7);
    g.fillStyle(0xfde047);
    g.fillRect(4, 8, 8, 3); // Brilho do ouro
    g.fillStyle(0xb45309);
    g.fillRect(2, 2, 12, 4); // Tampa aberta
    g.generateTexture(ASSET_KEYS.ITEMS.CHEST_OPEN, 16, 16);
    g.destroy();
  }

  // 14. Efeito de Corte Melee (Slash FX) (20x20)
  if (!textures.exists(ASSET_KEYS.ITEMS.SLASH_FX)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.lineStyle(3, 0x67e8f9, 0.9);
    g.beginPath();
    g.arc(10, 10, 8, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45), false);
    g.strokePath();
    g.lineStyle(1, 0xffffff, 1);
    g.beginPath();
    g.arc(10, 10, 8, Phaser.Math.DegToRad(-35), Phaser.Math.DegToRad(35), false);
    g.strokePath();
    g.generateTexture(ASSET_KEYS.ITEMS.SLASH_FX, 20, 20);
    g.destroy();
  }

  // 15. Projétil Mágico (8x8)
  if (!textures.exists(ASSET_KEYS.ITEMS.PROJECTILE)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xc084fc, 0.5);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xa855f7);
    g.fillCircle(4, 4, 2.5);
    g.fillStyle(0xffffff);
    g.fillCircle(3, 3, 1);
    g.generateTexture(ASSET_KEYS.ITEMS.PROJECTILE, 8, 8);
    g.destroy();
  }

  // 16. Corações de Vida UI (12x12)
  if (!textures.exists(ASSET_KEYS.UI.HEART_FULL)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xef4444);
    g.fillCircle(3.5, 3.5, 3.5);
    g.fillCircle(8.5, 3.5, 3.5);
    g.fillTriangle(0.5, 4.5, 11.5, 4.5, 6, 11.5);
    g.fillStyle(0xfecaca);
    g.fillRect(3, 2, 2, 2);
    g.generateTexture(ASSET_KEYS.UI.HEART_FULL, 12, 12);
    g.destroy();
  }

  if (!textures.exists(ASSET_KEYS.UI.HEART_EMPTY)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x475569);
    g.fillCircle(3.5, 3.5, 3.5);
    g.fillCircle(8.5, 3.5, 3.5);
    g.fillTriangle(0.5, 4.5, 11.5, 4.5, 6, 11.5);
    g.fillStyle(0x1e293b);
    g.fillCircle(3.5, 3.5, 2);
    g.fillCircle(8.5, 3.5, 2);
    g.generateTexture(ASSET_KEYS.UI.HEART_EMPTY, 12, 12);
    g.destroy();
  }

  // 17. Ícones de Relíquias (14x14)
  const createRelicIcon = (key: string, color: number, symbol: string) => {
    if (!textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x1e293b);
      g.fillRoundedRect(0, 0, 14, 14, 2);
      g.lineStyle(1, color);
      g.strokeRoundedRect(0.5, 0.5, 13, 13, 2);
      g.fillStyle(color);
      g.fillRect(3, 3, 8, 8);
      g.generateTexture(key, 14, 14);
      g.destroy();
    }
  };

  createRelicIcon(ASSET_KEYS.UI.RELIC_BOOTS, 0x38bdf8, 'B');
  createRelicIcon(ASSET_KEYS.UI.RELIC_TORCH, 0xf97316, 'T');
  createRelicIcon(ASSET_KEYS.UI.RELIC_VAMPIRE, 0xec4899, 'V');
  createRelicIcon(ASSET_KEYS.UI.RELIC_RING, 0x10b981, 'R');
  createRelicIcon(ASSET_KEYS.UI.RELIC_CROWN, 0xfacc15, 'C');
}
