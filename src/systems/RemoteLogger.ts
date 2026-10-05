/**
 * Sistema de Telemetria e Captura Central de Logs para Produção.
 * Captura exceções não tratadas (window.onerror, unhandledrejection),
 * erros de rede e chamadas de console.error/warn, enviando em lotes
 * para o Cloudflare Worker de forma segura e não-bloqueante.
 */

import { TURN_ENDPOINT } from '../network/TurnConfig';

export type LogLevel = 'info' | 'warn' | 'error';

export interface GameLogEntry {
  level: LogLevel;
  message: string;
  roomId?: string | null;
  scene?: string | null;
  stack?: string | null;
  context?: Record<string, any> | null;
  timestamp: string;
}

class RemoteLoggerClass {
  private buffer: GameLogEntry[] = [];
  private flushTimer: number | null = null;
  private currentRoomId: string | null = null;
  private currentScene: string | null = null;
  private isInitialized = false;

  // Rate limiting local: máximo de 30 logs por minuto para proteger tráfego
  private logsSentLastMinute = 0;
  private rateLimitResetTimer = 0;
  private lastMessage: string | null = null;
  private duplicateCount = 0;

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Captura de Erros JS Globais (exceções não tratadas)
    window.addEventListener('error', (event) => {
      this.error(event.message || 'Uncaught Error', {
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // 2. Captura de Promises Rejeitadas (falha de rede, carregamento de asset, etc)
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : (reason?.message || 'Unhandled Promise Rejection');
      this.error(message, {
        stack: reason?.stack,
        reason: typeof reason === 'object' ? JSON.stringify(reason) : String(reason)
      });
    });

    // 3. Interceptação segura de console.error e console.warn
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      // Evita loop infinito se o próprio logger usar console
      if (!msg.includes('[GAME_')) {
        this.error(msg);
      }
    };

    console.warn = (...args: any[]) => {
      originalConsoleWarn.apply(console, args);
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      if (!msg.includes('[GAME_') && !msg.includes('THREE.')) {
        this.warn(msg);
      }
    };

    // 4. Garantir envio antes de fechar a aba via sendBeacon
    const handleUnload = () => {
      this.flush(true);
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    this.info('Sessão do jogo iniciada', {
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      touchSupported: 'ontouchstart' in window
    });
  }

  public setRoomId(roomId: string | null): void {
    this.currentRoomId = roomId;
  }

  public setScene(sceneName: string | null): void {
    this.currentScene = sceneName;
  }

  public info(message: string, context?: Record<string, any>): void {
    this.pushLog('info', message, context);
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.pushLog('warn', message, context);
  }

  public error(message: string, context?: Record<string, any>): void {
    this.pushLog('error', message, context);
  }

  private pushLog(level: LogLevel, message: string, context?: Record<string, any>): void {
    const now = Date.now();

    // Reset rate limiter a cada minuto
    if (now - this.rateLimitResetTimer > 60000) {
      this.rateLimitResetTimer = now;
      this.logsSentLastMinute = 0;
    }

    if (this.logsSentLastMinute >= 30) {
      return; // Proteção contra loops infinitos de erro
    }

    // Deduplicação de mensagens idênticas consecutivas (ex: erro no loop de renderização)
    if (this.lastMessage === message) {
      this.duplicateCount++;
      if (this.duplicateCount > 3) {
        return; // Suprime repetições consecutivas
      }
    } else {
      this.lastMessage = message;
      this.duplicateCount = 0;
    }

    const entry: GameLogEntry = {
      level,
      message,
      roomId: this.currentRoomId,
      scene: this.currentScene,
      stack: context?.stack || (level === 'error' ? new Error().stack : undefined),
      context: context ? { ...context, stack: undefined } : undefined,
      timestamp: new Date().toISOString()
    };

    this.buffer.push(entry);
    this.logsSentLastMinute++;

    // Erros graves são enviados imediatamente; outros acumulam no buffer de 3s
    if (level === 'error' || this.buffer.length >= 10) {
      this.flush(false);
    } else if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => this.flush(false), 3000);
    }
  }

  public flush(useBeacon: boolean = false): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0 || !TURN_ENDPOINT) return;

    const payload = JSON.stringify(this.buffer);
    this.buffer = [];

    const logUrl = `${TURN_ENDPOINT.replace(/\/$/, '')}/log`;

    // 1. sendBeacon é ideal para fechamento de página (não cancelado pelo browser)
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(logUrl, blob);
        return;
      } catch (e) {
        // Fallback para fetch se o beacon falhar
      }
    }

    // 2. Fetch padrão assíncrono com keepalive
    fetch(logUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(() => {
      // Falha silenciosa para não travar o jogo se a internet cair
    });
  }
}

export const RemoteLogger = new RemoteLoggerClass();
