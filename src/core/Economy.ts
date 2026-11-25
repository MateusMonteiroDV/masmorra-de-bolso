/**
 * Divide uma recompensa de ouro em moedas físicas.
 * Recompensas grandes viram poucas moedas de valor maior, evitando dezenas de sprites na tela
 * sem perder nenhum ponto de ouro (a soma dos valores é sempre igual ao total).
 */
export function splitCoinReward(totalGold: number, maxCoins: number): number[] {
  const total = Math.max(1, Math.floor(totalGold));
  const coinCount = Math.max(1, Math.min(total, Math.floor(maxCoins)));
  const baseValue = Math.floor(total / coinCount);
  const remainder = total % coinCount;
  return Array.from({ length: coinCount }, (_, index) => baseValue + (index < remainder ? 1 : 0));
}
