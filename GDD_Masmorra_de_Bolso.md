# Masmorra de Bolso

## Game Design Document (GDD)

## 1. Visão Geral

**Conceito:** Um roguelite 2D top-down rápido e direto ao ponto. O jogador desce por andares gerados proceduralmente em uma masmorra, enfrentando hordas de inimigos, coletando ouro e relíquias. A morte é inevitável, mas os recursos acumulados servem para comprar melhorias permanentes na base antes da próxima tentativa (*run*).

**Gênero:** Ação / Roguelite 2D

**Plataforma-alvo:** PC e Mobile

**Público-alvo:** Jogadores casuais que gostam de sessões curtas (10-15 minutos) e progressão contínua.

**Estilo visual:** Pixel art minimalista (16x16) com foco na clareza do combate.

## 2. Core Loop (Ciclo Principal)

1. **Preparação:** Na base (*Hub*), o jogador usa Ouro para comprar melhorias permanentes, como Vida e Dano.
2. **Exploração e combate:** O jogador entra na masmorra, limpa salas procedurais, derrota inimigos e coleta Ouro e itens temporários.
3. **Morte e retorno:** A vida do jogador chega a zero. Ele perde os itens temporários, mas mantém o Ouro coletado e retorna à base para reiniciar o ciclo.

## 3. Mecânicas de Jogo

- **Movimentação:** Livre em 8 direções (*top-down*).
- **Combate:** O jogador tem um ataque básico e uma habilidade de esquiva (*dash*) que concede invulnerabilidade por alguns quadros de animação (*i-frames*).
- **Geração procedural:** Cada andar é composto por um grid de salas, por exemplo 3x3 ou 4x4, conectadas por portas que se trancam ao entrar até que todos os inimigos sejam derrotados.
- **Progressão da run (temporária):** Ao limpar certas salas, o jogador escolhe 1 entre 3 relíquias aleatórias, como "Ataques causam queimadura" ou "+20% de velocidade".
- **Progressão global (permanente):** Árvore de habilidades simples na base usando a moeda do jogo.

## 4. Inimigos e Chefes

Para manter o escopo simples, o jogo contará com três arquétipos básicos de inimigos e um chefe.

- **Slime (corpo a corpo lento):** Move-se lentamente em linha reta na direção do jogador. Possui muita vida.
- **Morcego (corpo a corpo rápido):** Possui movimentação errática e pouca vida. É perigoso em grandes grupos.
- **Esqueleto Mago (ataque à distância):** Fica parado ou foge do jogador enquanto dispara projéteis mágicos lentos.
- **Chefe - Rei Slime:** Encontrado a cada 5 andares. Invoca Slimes menores e tem um ataque de salto em área (*Slam*) que exige o uso correto do *Dash* para desviar.

## 5. Controles e UI

| Ação | Teclado / Mouse (PC) | Tela de Toque (Mobile) |
| --- | --- | --- |
| Movimento | WASD ou Setas | Joystick virtual esquerdo |
| Mirar | Cursor do mouse | Joystick virtual direito |
| Atacar | Botão esquerdo do mouse | Automático ao mirar ou botão de ação |
| Dash / Esquiva | Espaço ou botão direito | Botão de Dash dedicado |
| Interagir | Tecla E | Toque na tela sobre o objeto |

### Interface do Usuário (HUD)

- **Canto superior esquerdo:** Barra de vida (corações) e ícone da arma atual.
- **Canto superior direito:** Contador de Ouro e minimapa básico, gerado à medida que o jogador explora.
- **Canto inferior central:** Ícones dos itens temporários coletados na *run* atual.

## 6. Arte e Áudio

### Visual

Paleta de cores limitada. O ambiente deve ser escuro, com tons de cinza e marrom, enquanto jogador, inimigos e projéteis usam cores vibrantes, como neon, vermelho e azul, para destacar elementos perigosos e preservar o contraste de *gameplay*.

### Áudio

- Efeitos sonoros de impacto, coleta de moedas e *dash* devem ser satisfatórios e seguir um estilo chiptune / 8-bit.
- Música de fundo: uma faixa acelerada e rítmica para a masmorra e uma música calma e melancólica para a base (*Hub*).
