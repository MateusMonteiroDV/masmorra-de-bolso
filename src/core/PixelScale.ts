/**
 * Cálculo de escala "pixel-perfect" da tela.
 *
 * O jogo é desenhado para uma resolução lógica base (480x270). Em vez de deixar o navegador
 * esticar o canvas por um fator fracionário (o que deixa os pixels irregulares e o visual
 * "borrado"), calculamos um fator inteiro em pixels FÍSICOS do dispositivo e ajustamos o
 * tamanho lógico do jogo para preencher a tela inteira.
 */
export interface PixelViewport {
  /** Largura lógica do jogo (pixels do mundo/UI) */
  width: number;
  /** Altura lógica do jogo */
  height: number;
  /** Zoom CSS aplicado ao canvas pelo Scale Manager (pixelScale / devicePixelRatio) */
  zoom: number;
  /** Quantos pixels físicos do dispositivo cada pixel lógico ocupa */
  pixelScale: number;
}

export function computePixelViewport(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  baseWidth: number,
  baseHeight: number
): PixelViewport {
  const safeRatio = devicePixelRatio > 0 ? Math.min(devicePixelRatio, 4) : 1;
  const deviceWidth = Math.max(1, Math.round(cssWidth * safeRatio));
  const deviceHeight = Math.max(1, Math.round(cssHeight * safeRatio));

  const fitRatio = Math.min(deviceWidth / baseWidth, deviceHeight / baseHeight);
  // Escala inteira sempre que a tela comporta a resolução base; abaixo disso, reduz proporcionalmente.
  const pixelScale = fitRatio >= 1 ? Math.floor(fitRatio) : fitRatio;

  return {
    width: Math.floor(deviceWidth / pixelScale),
    height: Math.floor(deviceHeight / pixelScale),
    zoom: pixelScale / safeRatio,
    pixelScale
  };
}
