/**
 * Worker que gera credenciais TURN temporárias da Cloudflare para o Masmorra de Bolso.
 * A chave TURN (long-lived) fica apenas aqui como secret; o navegador recebe só
 * credenciais com expiração (TTL).
 */
interface Env {
  TURN_KEY_ID: string;
  TURN_KEY_API_TOKEN: string;
  ALLOWED_ORIGINS: string;
}

const CREDENTIAL_TTL_SECONDS = 86400; // 24h

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const allowed = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    const origin = req.headers.get('Origin') ?? '';
    const isPagesDev = /^https:\/\/[a-z0-9-]+\.masmorra-de-bolso\.pages\.dev$/i.test(origin) || origin === 'https://masmorra-de-bolso.pages.dev';
    const isAllowed = isPagesDev || allowed.includes(origin);

    const url = new URL(req.url);

    const cors: Record<string, string> = {
      'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (origin && !isAllowed) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }

    // Rota 1: Coleta central de logs do jogo (erros, alertas, rede, crashes)
    if (req.method === 'POST' && (url.pathname === '/log' || url.pathname === '/logs')) {
      try {
        const bodyText = await req.text();
        const logs = JSON.parse(bodyText);
        const entries = Array.isArray(logs) ? logs : [logs];
        const cfData = (req as any).cf;
        const country = cfData?.country || 'XX';
        const city = cfData?.city || '';
        const ip = req.headers.get('cf-connecting-ip') || 'unknown';

        for (const entry of entries) {
          const prefix = `[GAME_${(entry.level || 'INFO').toUpperCase()}][${country}${city ? `/${city}` : ''}][IP:${ip}]`;
          const msg = entry.message || '(no message)';
          const meta = {
            roomId: entry.roomId || null,
            scene: entry.scene || null,
            stack: entry.stack || null,
            context: entry.context || null,
            timestamp: entry.timestamp || new Date().toISOString()
          };

          if (entry.level === 'error') {
            console.error(`${prefix} ${msg}`, JSON.stringify(meta));
          } else if (entry.level === 'warn') {
            console.warn(`${prefix} ${msg}`, JSON.stringify(meta));
          } else {
            console.log(`${prefix} ${msg}`, JSON.stringify(meta));
          }
        }

        return new Response(JSON.stringify({ ok: true, count: entries.length }), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        console.warn('[LOG_PARSE_ERROR]', err?.message);
        return new Response(JSON.stringify({ error: 'invalid log format' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // Rota 2: Credenciais TURN WebRTC
    if (req.method === 'GET') {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
        }
      );

      return new Response(await res.text(), {
        status: res.ok ? 200 : 502,
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
};
