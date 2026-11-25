import * as Phaser from 'phaser';
import { generateProceduralPlaceholders } from '../assets/PlaceholderGen';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  public preload() {
    generateProceduralPlaceholders(this);

    // 1. Mapas: Sala Principal (ondas) e Sala do Capetão (chefe final)
    this.load.image('mapa_sala_principal', '/assets/mapa/sala_principal.png');
    this.load.image('mapa_sala_chefe', '/assets/mapa/sala_chefe.png');

    // 2. Tela Inicial / Capa
    this.load.image('pagina_inicial', '/assets/pagina_inicial/pagina_inicial.png');

    // 3. Projétil da Flecha
    this.load.image('arrow_sprite', '/assets/flexa/flexaaa4.png');

    // 3. Moeda de Ouro (9 frames)
    for (let i = 0; i <= 8; i++) {
      this.load.image(`moeda_${i}`, `/assets/moeda/sprite_${i}.png`);
    }

    // 4. Nuvem de Impacto / Poeira (8 frames)
    for (let i = 0; i <= 7; i++) {
      this.load.image(`nuvem_${i}`, `/assets/nuvem-monstro/sprite_${i}.png`);
    }

    // 5. Roberto - Direita (14 frames)
    for (let i = 0; i <= 13; i++) {
      const idx = i.toString().padStart(2, '0');
      this.load.image(`roberto_d_${idx}`, `/assets/movimentacao/direita/roberto/sprite_${idx}.png`);
    }

    // 5b. Roberto - Quadros extras de caminhada com quique de 1px (passada mais fluida)
    for (const side of [{ key: 'd', folder: 'direita' }, { key: 'e', folder: 'esquerda' }]) {
      this.load.image(`roberto_${side.key}_walk_bob_01`, `/assets/movimentacao/${side.folder}/roberto/walk_bob_01.png`);
      this.load.image(`roberto_${side.key}_walk_bob_02`, `/assets/movimentacao/${side.folder}/roberto/walk_bob_02.png`);
    }

    // 6. Roberto - Esquerda (14 frames)
    for (let i = 0; i <= 13; i++) {
      const idx = i.toString().padStart(2, '0');
      this.load.image(`roberto_e_${idx}`, `/assets/movimentacao/esquerda/roberto/sprite_${idx}.png`);
    }

    // 7. Roberto - Morte Direita e Esquerda (5 frames cada)
    for (let i = 0; i <= 4; i++) {
      this.load.image(`roberto_morte_d_${i}`, `/assets/movimentacao/direita/morte/sprite_${i}.png`);
      this.load.image(`roberto_morte_e_${i}`, `/assets/movimentacao/esquerda/morte/sprite_${i}.png`);
    }

    // 8. Slime - Direita e Esquerda (15 frames cada)
    for (let i = 0; i <= 14; i++) {
      const idx = i.toString().padStart(2, '0');
      this.load.image(`slime_d_${idx}`, `/assets/movimentacao/direita/slime/sprite_${idx}.png`);
      this.load.image(`slime_e_${idx}`, `/assets/movimentacao/esquerda/slime/sprite_${idx}.png`);
    }

    // 9. Esqueleto Mago e Magia de Fogo (novo asset do artista)
    this.load.image('mago_d_00', '/assets/esqueleto_mago/mago_d_00.png');
    this.load.image('mago_d_01', '/assets/esqueleto_mago/mago_d_01.png');
    this.load.image('mago_cast_d', '/assets/esqueleto_mago/mago_cast_d.png');
    this.load.image('mago_e_00', '/assets/esqueleto_mago/mago_e_00.png');
    this.load.image('mago_e_01', '/assets/esqueleto_mago/mago_e_01.png');
    this.load.image('mago_cast_e', '/assets/esqueleto_mago/mago_cast_e.png');
    this.load.image('fireball_0', '/assets/esqueleto_mago/fireball_0.png');
    this.load.image('fireball_1', '/assets/esqueleto_mago/fireball_1.png');

    // 10. Rei Slime (Chefe) (16 frames: movimento 00-03, ataque 04-07, dano 08-11, morte 12-15)
    for (let i = 0; i <= 15; i++) {
      const idx = i.toString().padStart(2, '0');
      this.load.image(`king_slime_${idx}`, `/assets/king_slime/sprite_${idx}.png`);
    }

    // 11. Vendedor / Barraco da Loja (5 frames: 0 a 4)
    for (let i = 0; i <= 4; i++) {
      this.load.image(`vendedor_${i}`, `/assets/vendedor/sprite_${i}.png`);
    }

    // 12. Minotauro com Machado (Elite) (20 frames em cada direção: 00 a 19)
    for (let i = 0; i <= 19; i++) {
      const idx = i.toString().padStart(2, '0');
      this.load.image(`minotaur_d_${idx}`, `/assets/minotauro/minotaur_d_${idx}.png`);
      this.load.image(`minotaur_e_${idx}`, `/assets/minotauro/minotaur_e_${idx}.png`);
    }

    // 12b. Baú de Relíquias (4 frames: fechado -> totalmente aberto)
    for (let i = 0; i <= 3; i++) {
      this.load.image(`bau_${i}`, `/assets/bau/sprite_${i}.png`);
    }

    // 13. Capetão (Chefe Final) (33 frames: 00 a 32)
    for (let i = 0; i <= 32; i++) {
      const idx = i.toString().padStart(2, '0');
      this.load.image(`capetao_${idx}`, `/assets/capetao/sprite_${idx}.png`);
    }
  }

  public create() {
    this.createAnimations();
    this.scene.start('TitleScene');
  }

  private createAnimations() {
    const anims = this.anims;

    // Animação da Moeda Girando (Frames 0 a 4: rotação contínua)
    anims.create({
      key: 'anim_moeda',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `moeda_${i}` })),
      frameRate: 8,
      repeat: -1
    });

    // Animação da Coleta da Moeda (Frames 5 a 8: brilho dourado e desaparecimento)
    anims.create({
      key: 'anim_moeda_collect',
      frames: [
        { key: 'moeda_5' },
        { key: 'moeda_6' },
        { key: 'moeda_7' },
        { key: 'moeda_8' }
      ],
      frameRate: 12,
      repeat: 0
    });

    // Animação da Nuvem de Impacto
    anims.create({
      key: 'anim_nuvem',
      frames: Array.from({ length: 8 }, (_, i) => ({ key: `nuvem_${i}` })),
      frameRate: 16,
      repeat: 0
    });

    // Roberto - Caminhada
    anims.create({
      key: 'roberto_walk_d',
      frames: [
        { key: 'roberto_d_01' },
        { key: 'roberto_d_walk_bob_01' },
        { key: 'roberto_d_00' },
        { key: 'roberto_d_02' },
        { key: 'roberto_d_walk_bob_02' },
        { key: 'roberto_d_00' }
      ],
      frameRate: 11,
      repeat: -1
    });

    anims.create({
      key: 'roberto_walk_e',
      frames: [
        { key: 'roberto_e_01' },
        { key: 'roberto_e_walk_bob_01' },
        { key: 'roberto_e_00' },
        { key: 'roberto_e_02' },
        { key: 'roberto_e_walk_bob_02' },
        { key: 'roberto_e_00' }
      ],
      frameRate: 11,
      repeat: -1
    });

    // Roberto - Ataque com Espada
    anims.create({
      key: 'roberto_attack_d',
      frames: [
        { key: 'roberto_d_03' },
        { key: 'roberto_d_04' },
        { key: 'roberto_d_05' },
        { key: 'roberto_d_06' },
        { key: 'roberto_d_07' }
      ],
      frameRate: 14,
      repeat: 0
    });

    anims.create({
      key: 'roberto_attack_e',
      frames: [
        { key: 'roberto_e_03' },
        { key: 'roberto_e_04' },
        { key: 'roberto_e_05' },
        { key: 'roberto_e_06' },
        { key: 'roberto_e_07' }
      ],
      frameRate: 14,
      repeat: 0
    });

    // Roberto - Disparo de Besta (Horizontal)
    anims.create({
      key: 'roberto_shoot_d',
      frames: [
        { key: 'roberto_d_09' },
        { key: 'roberto_d_10' },
        { key: 'roberto_d_11' }
      ],
      frameRate: 12,
      repeat: 0
    });

    anims.create({
      key: 'roberto_shoot_e',
      frames: [
        { key: 'roberto_e_09' },
        { key: 'roberto_e_10' },
        { key: 'roberto_e_11' }
      ],
      frameRate: 12,
      repeat: 0
    });

    // Roberto - Disparo de Besta (Vertical Cima)
    anims.create({
      key: 'roberto_shoot_up_d',
      frames: [
        { key: 'roberto_d_12' },
        { key: 'roberto_d_13' }
      ],
      frameRate: 10,
      repeat: 0
    });

    anims.create({
      key: 'roberto_shoot_up_e',
      frames: [
        { key: 'roberto_e_12' },
        { key: 'roberto_e_13' }
      ],
      frameRate: 10,
      repeat: 0
    });

    // Roberto - Morte
    anims.create({
      key: 'roberto_death_d',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `roberto_morte_d_${i}` })),
      frameRate: 7,
      repeat: 0
    });

    anims.create({
      key: 'roberto_death_e',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `roberto_morte_e_${i}` })),
      frameRate: 7,
      repeat: 0
    });

    // 8. Slime - Movimentação / Caminhada (Frames 00 a 06: pulo e salto suave)
    anims.create({
      key: 'slime_walk_d',
      frames: Array.from({ length: 7 }, (_, i) => ({ key: `slime_d_${i.toString().padStart(2, '0')}` })),
      frameRate: 8,
      repeat: -1
    });

    anims.create({
      key: 'slime_walk_e',
      frames: Array.from({ length: 7 }, (_, i) => ({ key: `slime_e_${i.toString().padStart(2, '0')}` })),
      frameRate: 8,
      repeat: -1
    });

    // 9. Slime - Ataque (Frames 07 a 09: garras brancas e investida)
    anims.create({
      key: 'slime_attack_d',
      frames: [
        { key: 'slime_d_07' },
        { key: 'slime_d_08' },
        { key: 'slime_d_09' }
      ],
      frameRate: 8,
      repeat: 0
    });

    anims.create({
      key: 'slime_attack_e',
      frames: [
        { key: 'slime_e_07' },
        { key: 'slime_e_08' },
        { key: 'slime_e_09' }
      ],
      frameRate: 8,
      repeat: 0
    });

    // 10. Slime - Morte (Frames 10 a 14: dano vermelho -> olhos em X -> poça esmagada)
    anims.create({
      key: 'slime_death_d',
      frames: [
        { key: 'slime_d_10' },
        { key: 'slime_d_11' },
        { key: 'slime_d_12' },
        { key: 'slime_d_13' },
        { key: 'slime_d_14' }
      ],
      frameRate: 8,
      repeat: 0
    });

    anims.create({
      key: 'slime_death_e',
      frames: [
        { key: 'slime_e_10' },
        { key: 'slime_e_11' },
        { key: 'slime_e_12' },
        { key: 'slime_e_13' },
        { key: 'slime_e_14' }
      ],
      frameRate: 8,
      repeat: 0
    });

    // 11. Esqueleto Mago - Movimentação e Conjuração
    anims.create({
      key: 'mago_walk_d',
      frames: [{ key: 'mago_d_00' }, { key: 'mago_d_01' }],
      frameRate: 4,
      repeat: -1
    });

    anims.create({
      key: 'mago_walk_e',
      frames: [{ key: 'mago_e_00' }, { key: 'mago_e_01' }],
      frameRate: 4,
      repeat: -1
    });

    anims.create({
      key: 'mago_cast_d',
      frames: [{ key: 'mago_d_01' }, { key: 'mago_cast_d' }, { key: 'mago_d_01' }],
      frameRate: 6,
      repeat: 0
    });

    anims.create({
      key: 'mago_cast_e',
      frames: [{ key: 'mago_e_01' }, { key: 'mago_cast_e' }, { key: 'mago_e_01' }],
      frameRate: 6,
      repeat: 0
    });

    // 12. Magia de Fogo / Projétil
    anims.create({
      key: 'fireball_fly',
      frames: [{ key: 'fireball_0' }, { key: 'fireball_1' }],
      frameRate: 8,
      repeat: -1
    });

    // 13. Rei Slime: frames frontais (simétricos), sem variação por direção
    const kingSlimeFrames = (...indexes: number[]) =>
      indexes.map(index => ({ key: `king_slime_${index.toString().padStart(2, '0')}` }));

    // Movimentação: se comprime, pula e aterrissa
    anims.create({ key: 'king_slime_walk', frames: kingSlimeFrames(0, 1, 2, 3), frameRate: 7, repeat: -1 });
    // Salto esmagador: se comprime e fica no ar (quadro de pulo) até o pouso
    anims.create({ key: 'king_slime_jump', frames: kingSlimeFrames(1, 2), frameRate: 6, repeat: 0 });
    // Ataque: prepara o golpe, bate no chão e se recompõe
    anims.create({ key: 'king_slime_attack', frames: kingSlimeFrames(4, 5, 6, 7), frameRate: 10, repeat: 0 });
    // Tomando dano: recua, pisca e volta à postura normal
    anims.create({ key: 'king_slime_hurt', frames: kingSlimeFrames(8, 9, 10, 11), frameRate: 14, repeat: 0 });
    // Morte: derrete até sobrar uma poça com a coroa
    anims.create({ key: 'king_slime_death', frames: kingSlimeFrames(12, 13, 14, 15), frameRate: 5, repeat: 0 });

    // 16. Vendedor / Barraco da Loja - Rotina do Mercador Atendendo no Balcão (5 frames: 0 a 4)
    // 0 (parado) -> 1 (braços abertos) -> 0 -> 2 (abaixa pegando estoque) -> 3 (pote no balcão) -> 0
    anims.create({
      key: 'vendedor_idle',
      frames: [
        { key: 'vendedor_0' },
        { key: 'vendedor_1' },
        { key: 'vendedor_0' },
        { key: 'vendedor_2' },
        { key: 'vendedor_3' },
        { key: 'vendedor_0' }
      ],
      frameRate: 2,
      repeat: -1
    });

    // Vendedor - Boas-vindas (ao se aproximar da barraca)
    anims.create({
      key: 'vendedor_welcome',
      frames: [
        { key: 'vendedor_0' },
        { key: 'vendedor_1' }
      ],
      frameRate: 3,
      repeat: 0
    });

    // Vendedor - Negociação / Balcão (ao abrir o menu de melhorias)
    anims.create({
      key: 'vendedor_trade',
      frames: [
        { key: 'vendedor_2' },
        { key: 'vendedor_3' }
      ],
      frameRate: 4,
      repeat: 0
    });

    // 17. Minotauro com Machado - Caminhada e Perseguição (Frames 00 a 04)
    anims.create({
      key: 'minotaur_walk_d',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `minotaur_d_${i.toString().padStart(2, '0')}` })),
      frameRate: 6,
      repeat: -1
    });

    anims.create({
      key: 'minotaur_walk_e',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `minotaur_e_${i.toString().padStart(2, '0')}` })),
      frameRate: 6,
      repeat: -1
    });

    // Minotauro - Ataque Pesado com Machado (Frames 05 a 09)
    anims.create({
      key: 'minotaur_attack_d',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `minotaur_d_${(i + 5).toString().padStart(2, '0')}` })),
      frameRate: 7,
      repeat: 0
    });

    anims.create({
      key: 'minotaur_attack_e',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `minotaur_e_${(i + 5).toString().padStart(2, '0')}` })),
      frameRate: 7,
      repeat: 0
    });

    // Minotauro - Rugido / Telégrafo de Fúria (Frames 10 a 12)
    anims.create({
      key: 'minotaur_roar_d',
      frames: [
        { key: 'minotaur_d_10' },
        { key: 'minotaur_d_11' },
        { key: 'minotaur_d_12' },
        { key: 'minotaur_d_11' },
        { key: 'minotaur_d_10' }
      ],
      frameRate: 6,
      repeat: 0
    });

    anims.create({
      key: 'minotaur_roar_e',
      frames: [
        { key: 'minotaur_e_10' },
        { key: 'minotaur_e_11' },
        { key: 'minotaur_e_12' },
        { key: 'minotaur_e_11' },
        { key: 'minotaur_e_10' }
      ],
      frameRate: 6,
      repeat: 0
    });

    // Minotauro - Investida Furiosa / Charge (Frames 13 e 14)
    anims.create({
      key: 'minotaur_charge_d',
      frames: [{ key: 'minotaur_d_13' }, { key: 'minotaur_d_14' }],
      frameRate: 8,
      repeat: -1
    });

    anims.create({
      key: 'minotaur_charge_e',
      frames: [{ key: 'minotaur_e_13' }, { key: 'minotaur_e_14' }],
      frameRate: 8,
      repeat: -1
    });

    // Minotauro - Morte (Frames 15 a 19)
    anims.create({
      key: 'minotaur_death_d',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `minotaur_d_${(i + 15).toString().padStart(2, '0')}` })),
      frameRate: 6,
      repeat: 0
    });

    anims.create({
      key: 'minotaur_death_e',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `minotaur_e_${(i + 15).toString().padStart(2, '0')}` })),
      frameRate: 6,
      repeat: 0
    });

    // 17b. Baú de Relíquias: abre e permanece no último quadro (aberto)
    anims.create({
      key: 'bau_abrindo',
      frames: [{ key: 'bau_0' }, { key: 'bau_1' }, { key: 'bau_2' }, { key: 'bau_3' }],
      frameRate: 10,
      repeat: 0
    });

    // 18. Capetão (Chefe Final). Quadros 00-09 olham para a esquerda, 10-18 para a direita.
    const capetaoFrames = (...indexes: number[]) =>
      indexes.map(index => ({ key: `capetao_${index.toString().padStart(2, '0')}` }));

    anims.create({ key: 'capetao_walk_e', frames: capetaoFrames(0, 1, 2, 3, 4, 3, 2, 1), frameRate: 9, repeat: -1 });
    anims.create({ key: 'capetao_walk_d', frames: capetaoFrames(10, 11, 12, 13, 12, 11), frameRate: 8, repeat: -1 });
    anims.create({ key: 'capetao_claw_e', frames: capetaoFrames(8, 9, 9, 0), frameRate: 9, repeat: 0 });
    anims.create({ key: 'capetao_claw_d', frames: capetaoFrames(14, 15, 15, 10), frameRate: 9, repeat: 0 });
    anims.create({ key: 'capetao_breath_e', frames: capetaoFrames(5, 5, 6, 7, 7, 7), frameRate: 9, repeat: 0 });
    anims.create({ key: 'capetao_breath_d', frames: capetaoFrames(16, 16, 17, 18, 18, 18), frameRate: 9, repeat: 0 });
    anims.create({ key: 'capetao_death_d', frames: capetaoFrames(19, 20, 21, 22, 23, 24, 25), frameRate: 6, repeat: 0 });
    anims.create({ key: 'capetao_death_e', frames: capetaoFrames(26, 27, 28, 29, 30, 31, 32), frameRate: 6, repeat: 0 });
  }
}
