/**
 * Autenticação administrativa.
 *
 * - Login com ADMIN_TOKEN → sessão aleatória em cookie HttpOnly, SameSite=Strict, Secure em produção, escopo /api/admin.
 * - Chamadas automatizadas podem usar `Authorization: Bearer <ADMIN_TOKEN>`.
 * - Acesso a partir de localhost sem token só fora de produção (atrás de proxy, todo tráfego parece local).
 * - Ações com sessão por cookie exigem o cabeçalho X-EZA-Admin (proteção contra CSRF: formulários de outros
 *   sites não conseguem enviar cabeçalhos personalizados sem CORS, que não é habilitado).
 */
import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const SESSION_COOKIE = 'eza_admin';
export const CSRF_HEADER = 'x-eza-admin';
const SESSION_TTL_MS = 8 * 60 * 60_000;

export type AuthMethod = 'local' | 'session' | 'token';

export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb) && a.length === b.length;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/**
 * Trava global de login: após `max` falhas dentro de `windowMs` (de qualquer IP), recusa novas tentativas
 * por `lockMs`. Complementa o limite por IP contra ataques distribuídos.
 */
export class LoginThrottle {
  private failures: number[] = [];
  private lockedUntil = 0;
  constructor(private max = 20, private windowMs = 15 * 60_000, private lockMs = 15 * 60_000, private now = () => Date.now()) {}

  /** Milissegundos restantes de bloqueio (0 = liberado). */
  blockedFor() {
    return Math.max(0, this.lockedUntil - this.now());
  }

  /** Registra uma falha; retorna true se ela disparou o bloqueio. */
  fail() {
    const t = this.now();
    this.failures = this.failures.filter((f) => t - f < this.windowMs);
    this.failures.push(t);
    if (this.failures.length >= this.max) {
      this.lockedUntil = t + this.lockMs;
      this.failures = [];
      return true;
    }
    return false;
  }

  reset() {
    this.failures = [];
  }
}

export class AdminAuth {
  private sessions = new Map<string, number>();
  constructor(private token: string, private allowLocal: boolean, private secureCookie: boolean) {}

  get tokenConfigured() {
    return Boolean(this.token);
  }

  private isLocal(req: FastifyRequest) {
    return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') && !req.headers['x-forwarded-for'];
  }

  private sessionValid(id: string | undefined) {
    if (!id) return false;
    const exp = this.sessions.get(id);
    if (!exp) return false;
    if (exp < Date.now()) {
      this.sessions.delete(id);
      return false;
    }
    return true;
  }

  /** Método de autenticação da requisição, ou null se não autorizada. */
  method(req: FastifyRequest): AuthMethod | null {
    const bearer = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (bearer && this.token && safeEqual(bearer, this.token)) return 'token';
    if (this.sessionValid(parseCookies(req.headers.cookie)[SESSION_COOKIE])) return 'session';
    if (this.allowLocal && this.isLocal(req)) return 'local';
    return null;
  }

  /** Para ações que alteram estado: sessão por cookie precisa do cabeçalho anti-CSRF. */
  canMutate(req: FastifyRequest): boolean {
    const m = this.method(req);
    if (!m) return false;
    if (m === 'session') return req.headers[CSRF_HEADER] === '1';
    return true;
  }

  login(given: string, reply: FastifyReply): boolean {
    if (!this.token || !safeEqual(given, this.token)) return false;
    const id = crypto.randomBytes(32).toString('base64url');
    this.sessions.set(id, Date.now() + SESSION_TTL_MS);
    for (const [k, exp] of this.sessions) if (exp < Date.now()) this.sessions.delete(k);
    reply.header('Set-Cookie', this.cookie(id, SESSION_TTL_MS / 1000));
    return true;
  }

  logout(req: FastifyRequest, reply: FastifyReply) {
    const id = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (id) this.sessions.delete(id);
    reply.header('Set-Cookie', this.cookie('', 0));
  }

  private cookie(value: string, maxAge: number) {
    return `${SESSION_COOKIE}=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${Math.round(maxAge)}${this.secureCookie ? '; Secure' : ''}`;
  }
}
