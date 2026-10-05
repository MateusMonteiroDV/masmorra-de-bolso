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
    const isAllowed = allowed.includes(origin);

    const cors: Record<string, string> = {
      'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }
    if (origin && !isAllowed) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }

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
  },
};
