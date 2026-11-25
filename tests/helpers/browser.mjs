import { existsSync } from 'node:fs';

/**
 * Resolve o executável do Chrome/Chromium usado pelos testes E2E.
 * Prioriza CHROME_PATH; depois tenta os caminhos comuns do sistema.
 */
export function resolveChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find(path => existsSync(path));
}
