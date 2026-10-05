/**
 * Credenciais TURN temporárias, obtidas do Cloudflare Worker em /turn-worker.
 * Se o endpoint estiver vazio ou falhar, o jogo segue funcionando apenas com STUN.
 */

// URL do Worker publicado (`npx wrangler deploy` dentro de /turn-worker)
export const TURN_ENDPOINT = 'https://masmorra-turn.mateusdosantosmonteiro12.workers.dev';

// Credenciais valem 24h no Worker; renovamos antes disso por segurança
const REFRESH_AFTER_MS = 20 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

let turnServers: RTCIceServer[] = [];
let fetchedAt = 0;
let inFlight: Promise<void> | null = null;

export function preloadTurnServers(): Promise<void> {
  if (!TURN_ENDPOINT) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(TURN_ENDPOINT, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { iceServers } = (await res.json()) as { iceServers: RTCIceServer[] };

      turnServers = iceServers
        .map(server => ({
          ...server,
          // Porta 53 é bloqueada pelos navegadores e só causa timeout (recomendação da Cloudflare)
          urls: ([] as string[]).concat(server.urls).filter(url => !/:53(\?|$)/.test(url))
        }))
        .filter(server => (server.urls as string[]).some(url => url.startsWith('turn')));

      fetchedAt = Date.now();
      console.log('[TURN] Credenciais carregadas');
    } catch (err) {
      console.warn('[TURN] Indisponível, seguindo apenas com STUN:', err);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export async function ensureTurnServers(): Promise<RTCIceServer[]> {
  if (turnServers.length > 0 && Date.now() - fetchedAt < REFRESH_AFTER_MS) {
    return turnServers;
  }
  if (inFlight) {
    await inFlight;
    return turnServers;
  }
  await preloadTurnServers();
  return turnServers;
}

export function getTurnServers(): RTCIceServer[] {
  if (TURN_ENDPOINT && Date.now() - fetchedAt > REFRESH_AFTER_MS) {
    // Renova em segundo plano para a próxima sala; usa o que já temos agora
    void preloadTurnServers();
  }
  return turnServers;
}
