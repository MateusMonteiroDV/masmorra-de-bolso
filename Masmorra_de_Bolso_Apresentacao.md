# Masmorra de Bolso

> **Roguelite 2D Top-Down Rápido e Direto ao Ponto**  
> Proposta de jogo de ação casual com partidas curtas e progressão contínua.

## Visão Geral e Pilares

### Sessões Curtas

Runs rápidas de 10 a 15 minutos, ideais para o público casual que busca ação imediata sem enrolação.

### Pixel Art 16x16

Estilo minimalista e limpo. Alto contraste visual para que o foco fique na ação e nos elementos vivos com cores neon.

### Multiplataforma

Experiência fluida e consistente desenvolvida com foco em PC e dispositivos mobile.

## Core Loop (Ciclo Principal)

1. **Preparação** - Use o Ouro acumulado no *Hub* para comprar melhorias permanentes de vida e dano.
2. **Exploração** - Desça na masmorra, limpe salas procedurais, derrote monstros e receba relíquias.
3. **Morte e Retorno** - Ao morrer, perca os itens da *run*, mas mantenha o Ouro para evoluir na base e tentar de novo.

## Mecânicas Principais

### Movimentação e Combate

- Movimento livre em 8 direções (*top-down*) responsivas.
- Ataque ao mirar; o ataque básico pode ser independente para controle preciso ou modificado.
- Esquiva (*Dash*) com quadros de invulnerabilidade (*i-frames*) para desviar de golpes e projéteis.

### Masmorra Procedural

- Estrutura em grid, com andares compostos por grids 3x3 ou 4x4 conectados por portas.
- **Lockdown de salas:** portas se trancam ao entrar e só abrem após derrotar todos os inimigos.
- Recompensas: baús, joias e escolha de relíquias ao limpar salas específicas.

## Sistemas de Progressão

### Progressão da Run (Temporária)

- Escolha 1 entre 3 relíquias aleatórias ao vencer salas de desafio.
- Gera sinergias e *builds* únicas a cada tentativa, como ataques com queimadura ou +20% de velocidade.
- Todos os efeitos e relíquias são reiniciados ao morrer.

### Progressão Global (Permanente)

- Árvore de habilidades acessível no *Hub* antes da *run*.
- Utiliza o Ouro acumulado para comprar bônus definitivos.
- Exemplos: aumento de vida, dano base e eficiência de cura e itens iniciais.

## Inimigos e Chefe

| Inimigo | Tipo de ataque | Comportamento principal |
| --- | --- | --- |
| Slime | Corpo a corpo (lento) | Avança em linha reta na direção do herói; possui alta resistência. |
| Morcego | Corpo a corpo (rápido) | Movimentação rápida e errática, com pouca vida; letal em bandos. |
| Esqueleto Mago | À distância (mágico) | Mantém distância e dispara esferas mágicas lentas pelo salão. |
| Rei Slime (chefe) | Salto em área e invocação | Aparece a cada 5 andares; usa ataque devastador que exige *Dash* preciso. |

## Mapeamento de Controles

| Ação | PC (Teclado e Mouse) | Mobile (Touchscreen) |
| --- | --- | --- |
| Movimentação | WASD / Setas direcionais | Joystick virtual esquerdo |
| Mirar | Cursor do mouse | Joystick virtual direito |
| Atacar | Botão esquerdo do mouse | Automático / botão de ataque |
| Dash (Esquiva) | Barra de espaço / botão direito | Botão de Dash dedicado |
| Interagir | Tecla E | Toque direto no alvo / ícone |

## Interface do Usuário (HUD)

- **Superior esquerdo:** barra de vida indicada por corações e ícone da arma atualmente equipada.
- **Superior direito:** contador de Ouro coletado na *run* e minimapa com salas exploradas.
- **Inferior central:** lista horizontal com ícones e status de todas as relíquias ativas na *run* atual.

## Direção de Arte e Áudio

### Identidade Visual

- Cenários escuros, em tons de cinza, pedra e marrom, para compor a atmosfera da masmorra.
- Alto contraste: herói, monstros e projéteis utilizam cores vibrantes e saturadas para destacar o que é importante no combate.

### Identidade Sonora

- **SFX chiptune:** efeitos 8-bit marcantes e táteis para ataques, itens, *dash* e mortes.
- **Trilha sonora:** música rítmica e acelerada na masmorra; versão calma e melancólica no *Hub*.

---

**Game Design Document - Versão 1.0**  
*Pronto para o desenvolvimento.*
