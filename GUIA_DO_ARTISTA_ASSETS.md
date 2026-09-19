# 🎨 Guia de Assets para o Artista — Masmorra de Bolso

Bem-vindo! Este documento foi preparado especialmente para o artista da equipe. O jogo foi estruturado de forma **100% modular**: todos os sprites e sons possuem dimensões pré-padronizadas e placeholders procedurais. 

Quando você finalizar uma arte, **basta salvar a imagem no caminho indicado** mantendo a dimensão dos frames. O jogo recarregará automaticamente!

---

## 1. Padrões Gerais de Arte

- **Resolução de Grade Base:** `16x16` pixels (salvo o Chefe que é `32x32`).
- **Formato dos Arquivos:** `.png` com fundo transparente (canal Alpha).
- **Proporção:** Pixel art puro (sem filtros de anti-aliasing / blur na exportação).
- **Paleta de Cores Recomendada:**
  - **Cenários/Masmorra:** Tons escuros e sóbrios (ardósia, cinza, marrom-escuro, pedra úmida).
  - **Personagens e Projéteis:** Tons vivos e saturados de alto contraste (azul elétrico, verde lodo, vermelho rubi, ciano, roxo mágico) para clareza visual durante o combate.

---

## 2. Personagens e Inimigos (`public/assets/sprites/characters/`)

| Arquivo | Tamanho do Frame | Descrição |
| :--- | :--- | :--- |
| `player.png` | **16x16** px | O Herói da Masmorra (vista top-down, empunhando espada). |
| `slime.png` | **16x16** px | Slime verde clássico (corpo a corpo lento com alta vida). |
| `bat.png` | **16x16** px | Morcego roxo/escuro com olhos vermelhos (movimento rápido e errático). |
| `skeleton.png` | **16x16** px | Esqueleto mago encapuzado com cajado/orbe mágico. |
| `king_slime.png`| **32x32** px | Chefe Rei Slime com coroa real e grande presença. |
| `npc_shop.png` | **16x16** px | Ferreiro / Mercador encapuzado que vende melhorias na base. |

> [!TIP]
> **Spritesheets e Animações:**
> Caso crie spritesheets horizontais (ex: 4 frames de caminhada = $64 \times 16$ px), basta nos avisar ou configurar no arquivo [`src/assets/AssetManifest.ts`](file:///home/jixkls/Dev/Personal/masmorra-de-bolso/src/assets/AssetManifest.ts) a quantidade de frames.

---

## 3. Cenários e Ambiente (`public/assets/sprites/environment/`)

| Arquivo | Tamanho do Frame | Descrição |
| :--- | :--- | :--- |
| `tileset_dungeon.png`| **16x16** px | Tiles de chão e blocos de parede de pedra da masmorra. |
| `doors.png` | **16x16** px | Portas abertas e trancadas (portcullis com grades de ferro). |
| `campfire.png` | **16x16** px | Fogueira acesa do acampamento da Base (*Hub*). |
| `portal.png` | **24x24** px | Portal místico dimensional para descer na masmorra. |

---

## 4. Itens, Efeitos e UI (`public/assets/sprites/items/` e `ui/`)

| Arquivo | Tamanho do Frame | Descrição |
| :--- | :--- | :--- |
| `coins.png` | **10x10** ou **16x16** px | Moedas de ouro girando/brilhando. |
| `chests.png` | **16x16** px | Baú fechado e baú aberto brilhando com tesouros. |
| `slash.png` | **20x20** px | Efeito de corte em arco do golpe de espada. |
| `projectile.png` | **8x8** px | Orbe de magia escura/arcana disparada pelo Mago. |
| `hearts.png` | **12x12** px | Coração cheio (vermelho) e vazio (cinza) da barra de vida. |
| `relics.png` | **14x14** px | Ícones das relíquias (Botas, Tocha, Amuleto, Anel, Coroa). |

---

## 5. Efeitos Sonoros e Músicas (`public/assets/audio/`)

O jogo já vem com um **sintetizador 8-bit chiptune embutido** para todos os golpes, passos, moedas e danos. Se quiser substituir por gravações personalizadas:
- **Formato:** `.wav` para efeitos sonoros (SFX) e `.mp3` / `.ogg` para trilha musical de fundo.
- **Pastas:**
  - `public/assets/audio/sfx/`: `hit.wav`, `dash.wav`, `coin.wav`, `buy.wav`, `clear.wav`.
  - `public/assets/audio/music/`: `hub_theme.mp3` (calma e melancólica), `dungeon_theme.mp3` (agitada e ritmada).
