# ⚔️ Masmorra de Bolso — Roguelite 2D Top-Down

Um jogo de ação roguelite top-down rápido e direto ao ponto, desenvolvido para Web com foco em sessões dinâmicas (10-15 minutos), pixel art 16x16 e progressão contínua.


---

## 🚀 Tecnologias Utilizadas

- **Engine:** [Phaser 3 / 4](https://phaser.io/) — Renderização nativa de Pixel Art sem borrões (`nearest-neighbor`), física Arcade e áudio WebAudio.
- **Linguagem:** TypeScript — Tipagem estrita de componentes, eventos, atributos e entidades.
- **Bundler:** Vite — Hot Module Replacement (HMR) ultrarrápido e build estática otimizada para deploy web.

---

## 🎮 Controles

| Ação | Teclado & Mouse |
| :--- | :--- |
| **Movimentação (8 Direções)** | `W, A, S, D` ou `Setas Direcionais` |
| **Golpe de Espada** | `Barra de Espaço` ou `Botão Esquerdo do Mouse` |
| **Esquiva (Dash c/ i-frames)** | `Shift` ou `Botão Direito do Mouse` |
| **Interagir (Loja / Baús / Portal)** | Tecla `E` |

---

## 🧱 Arquitetura e Modularidade

O projeto foi construído sob uma arquitetura desacoplada de alto nível:

1. **Catálogo de Assets e Placeholders (`src/assets/`)**:
   - `AssetManifest.ts`: Fonte única de verdade de caminhos e tamanhos de frames.
   - `PlaceholderGen.ts`: Sintetizador de texturas procedurais estilo 16x16 em tempo real. O jogo já é 100% jogável antes de o artista exportar os sprites finais!
   - Consulte o [Guia do Artista](./GUIA_DO_ARTISTA_ASSETS.md) para instruções de importação de arte.
2. **Entidades e Componentes (`src/components/` e `src/entities/`)**:
   - `HealthComponent`: Controle de HP, dano, cura e quadros de invulnerabilidade (*i-frames*).
   - `MovementComponent`: Vetor normalizado (evita velocidade extra na diagonal), física de esquiva e repulsão (*knockback*).
   - `AttackComponent`: Hitboxes dinâmicas de corte, cooldown e bônus de queimadura/vampirismo.
3. **Masmorra Procedural (`src/dungeon/`)**:
   - Gerador de matriz de salas conectadas (Início, Combate, Tesouro e Chefe).
   - Sistema de **Lockdown**: salas de combate trancam as portas até que todos os monstros sejam derrotados.
4. **Hub e Loja Permanente (`src/scenes/HubScene.ts` e `src/ui/ShopModal.ts`)**:
   - Ao morrer ou vencer uma run, **todo o ouro acumulado é preservado**.
   - Árvore de melhorias permanentes (Vitalidade, Dano, Esquiva, Cobiça) salva automaticamente no `localStorage`.
5. **HUD Desacoplado via EventBus (`src/scenes/UIScene.ts`)**:
   - Exibição de corações, ouro, minimapa de salas exploradas e relíquias ativas sem poluir a lógica dos personagens.
6. **Efeitos Sonoros 8-Bit Embutidos (`src/systems/AudioService.ts`)**:
   - Sintetizador WebAudio chiptune para sons táteis imediatos de espada, dash, impacto, moedas e salas limpas.

---

## 📦 Como Executar o Projeto

### Pré-requisitos
- Node.js instalado (v18 ou superior).

### Instalação
```bash
npm install
```

### Rodar localmente em modo Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### Gerar Build de Produção (para entrega / deploy)
```bash
npm run build
```
Os arquivos otimizados prontos para publicação estarão na pasta `dist/`.
